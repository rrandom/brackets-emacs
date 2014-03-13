/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, console*/
define(function (require, exports, module) {
    'use strict';
    
    var EditorManager       = brackets.getModule("editor/EditorManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus"),
        Commands            = brackets.getModule("command/Commands"),
        KeyBindingManager   = brackets.getModule("command/KeyBindingManager"),
        AppInit             = brackets.getModule("utils/AppInit"),
        
        // Constants
        CHAR        = "character",
        WORD        = "word",
        LINE        = "line",
        MAX_LINE_LENGTH = 1000,
        
        // Text Selection Ring
        ring        = [],
        ringIndex   = 0,
        ringSize    = 15,
        
        // Mark
        isMarkSet   = false;

    function setMarkCommand() {
        isMarkSet = !isMarkSet;
        
        console.log("Mark " + (isMarkSet ? "un" : "") + "set");
    }

    function _killRingSave(selectedText) {
        if (!selectedText) {
            return;
        }
        ring[ringIndex % ringSize] = selectedText;
        ringIndex++;
    }

    function killRingSave() {
        var editor  = EditorManager.getFocusedEditor();
        _killRingSave(editor.getSelectedText());
    }

    function killRegion() {
        var editor      = EditorManager.getFocusedEditor(),
            doc         = editor.document,
            selection   = editor.getSelection();
        _killRingSave(editor.getSelectedText());
        doc.replaceRange("", selection.start, selection.end);
    }

    function yank() {
        if (ring.length === 0) {
            return;
        }
        var editor      = EditorManager.getFocusedEditor(),
            doc         = editor.document,
            cursorPos   = editor.getCursorPos();
        doc.replaceRange(ring[(ringIndex - 1) % ringSize], cursorPos);
    }

    function iSearchBackward() {
        // @todo: stub
    }
    
    /**
     * Function to move the cursor
     *
     * @param   {number}    unit        Number of units to move
     * @param   {number}    type        CHAR|WORD|LINE
     * @param   {boolean}   absolute    Flag to specify if the cursor isn't moved relative to the current
     *                                  position
     */
    function moveCursor(unit, type, absolute) {
        var editor      = EditorManager.getFocusedEditor(),
            cursorPos   = editor.getCursorPos(),
            line        = cursorPos.line,
            column        = cursorPos.ch;
        switch (type) {
        case CHAR:
            column += unit - (absolute ? column : 0);
            break;
        case LINE:
            line += unit - (absolute ? line : 0);
            break;
        case WORD:
            if (Math.abs(unit) !== 1) {
                console.error("Cursor positioning for multiple words is not supported");
                return;
            }
            var text = editor.document.getLine(line),
                lineLength = text.length;
            if (unit === 1) {
                text = text.substring(column);
            } else {
                // @todo: use a better implementation for reversing a string
                // http://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
                text = text.split("").reverse().join("").substring(lineLength - column);
            }
                
            var indexOfNextWord = text.search(/\W\w/) + 1;
            if (indexOfNextWord > 0) {
                column += (unit * indexOfNextWord) - (absolute ? column : 0);
            } else {
                line += unit > 0 ? 1 : -1;
                column = MAX_LINE_LENGTH;
            }
            break;
        }
        editor.setCursorPos(line, column);
    }
    
    AppInit.appReady(function () {

        var menus = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU),
            
            // Command Ids
            MOVE_BEGINNING_OF_LINE  = "emacs.move-beginning-of-line",
            MOVE_END_OF_LINE        = "emacs.move-end-of-line",
            YANK                    = "emacs.yank",
            KILL_REGION             = "emacs.kill-region",
            KILL_RING_SAVE          = "emacs.kill-ring-save",
            FORWARD_CHAR            = "emacs.forward-char",
            BACKWARD_CHAR           = "emacs.backward-char",
            FORWARD_WORD            = "emacs.forward-word",
            BACKWARD_WORD           = "emacs.backward-word",
            PREVIOUS_LINE           = "emacs.previous-line",
            NEXT_LINE               = "emacs.next-line",
            PREFIX_COMMAND          = "emacs.prefix-command",
            // .. not implemented ..
            SET_MARK_COMMAND        = "emacs.set-mark-command",
            ISEARCH_BACKWARD        = "emacs.isearch-backward",

            /*
             * Emacs commands
             *
             * Find list of commands in emacs: Ctrl-h b
             */
            commands = [
                {
                    id:         MOVE_BEGINNING_OF_LINE,
                    name:       "Move Beginning of Line",
                    keyBinding: "Ctrl-A",
                    callback:   moveCursor.bind(this, 0, CHAR, true)
                },
                {
                    id:         MOVE_END_OF_LINE,
                    name:       "Move End of Line",
                    keyBinding: "Ctrl-E",
                    callback:   moveCursor.bind(this, MAX_LINE_LENGTH, CHAR, true)
                },
                {
                    id:         YANK,
                    name:       "Yank",
                    keyBinding: "Ctrl-Y",
                    callback:   yank
                },
                {
                    id:         KILL_REGION,
                    name:       "Kill Region",
                    keyBinding: "Ctrl-W",
                    callback:   killRegion
                },
                {
                    id:         KILL_RING_SAVE,
                    name:       "Kill Ring Save",
                    keyBinding: "Alt-W",
                    callback:   killRingSave
                },
                {
                    id:         ISEARCH_BACKWARD,
                    name:       "Incremental Search Backward",
                    keyBinding: "Ctrl-R",
                    callback:   iSearchBackward
                },
                {
                    id:         FORWARD_CHAR,
                    name:       "Forward Character",
                    keyBinding: "Ctrl-F",
                    callback:   moveCursor.bind(this, 1, CHAR)
                },
                {
                    id:         BACKWARD_CHAR,
                    name:       "Backward Character",
                    keyBinding: "Ctrl-B",
                    callback:   moveCursor.bind(this, -1, CHAR)
                },
                {
                    id:         FORWARD_WORD,
                    name:       "Forward Word",
                    keyBinding: "Alt-F",
                    callback:   moveCursor.bind(this, 1, WORD)
                },
                {
                    id:         BACKWARD_WORD,
                    name:       "Backward Word",
                    keyBinding: "Alt-B",
                    callback:   moveCursor.bind(this, -1, WORD)
                },
                {
                    id:         NEXT_LINE,
                    name:       "Next Line",
                    keyBinding: "Ctrl-N",
                    callback:   moveCursor.bind(this, 1, LINE)
                },
                {
                    id:         PREVIOUS_LINE,
                    name:       "Previous Line",
                    keyBinding: "Ctrl-P",
                    callback:   moveCursor.bind(this, -1, LINE)
                },
                {
                    id:         PREFIX_COMMAND,
                    name:       "Prefix Command",
                    keyBinding: "Ctrl-X",
                    commands:   [
                        {
                            id:         Commands.FILE_OPEN,
                            keyBinding: "Ctrl-F",
                            override:   true
                        },
                        {
                            id:         Commands.FILE_SAVE,
                            keyBinding: "Ctrl-S",
                            override:   true
                        }
                    ]
                },
                {
                    id:         Commands.EDIT_UNDO,
                    keyBinding: "Ctrl-/",
                    override:   true
                },
                {
                    id:         Commands.EDIT_LINE_COMMENT,
                    keyBinding: "Alt-;",
                    override:   true
                },
                {
                    id:         Commands.EDIT_FIND,
                    keyBinding: "Ctrl-S",
                    override:   true
                }
//              {
//                  id:         SET_MARK_COMMAND,
//                  name:       "Set Mark Command",
//                  keyBinding: "Ctrl-Space",
//                  callback:   setMarkCommand
//              },
            ];


        /**
         * EventHandler Class
         *
         * Executes relevant commands when any of the specified keybindings are used.
         *
         * @param   {Array} commands    Commands that can be used for the next keybinding.
         *
         * @todo: move the EventHandler to a separate module
         */
        function EventHandler(allCommands) {
            this.availableCommands = allCommands; // @todo: no need to copy array, right?
        }

        EventHandler.prototype.commands = commands;
        
        EventHandler.prototype.availableCommands = undefined; // set on instantiation
        
        EventHandler.prototype.getCommand = function (keyBinding) {
            var command = this.availableCommands.filter(function find(command) {
                return (command.keyBinding === keyBinding) ? command : false;
            });
            if (command.length === 1) {
                return command[0]; // get the first match, there should only be one
            }
            return false;
        };

        /**
         * Function for reseting the context i.e. the number of available commands are not dependent on the last keyBinding used
         *
         * @param   {Array} commands    Commands that can be used for the next keybinding.
         */
        EventHandler.prototype.resetContext = function (commands) {
            this.availableCommands = commands || this.commands;
        };

        EventHandler.prototype.handle = function (keyBinding) {
            // Get the command to execute based on the stack
            var command = this.getCommand(keyBinding);
            
            if (!command) {
                this.resetContext();
                return;
            }
            
            if (!command.commands) {
                if (command.override) {
                    CommandManager.execute(command.id);
                } else {
                    command.callback();
                }
            }
            
            // Update the context
            this.resetContext(command.commands || undefined);
        };
        
        var handler = new EventHandler(commands);

        function removeBinding(command) {
            KeyBindingManager.removeBinding(command.keyBinding);
            if (typeof command.commands !== "undefined" && command.commands.length > 0) {
                command.commands.forEach(removeBinding);
            }
        }

        function addBinding(command) {
            if (command.override) {
                return;
            }
            KeyBindingManager.addBinding(command.id, command.keyBinding);
        }
        
        function register(command) {
            if (command.override) {
                return;
            }
            CommandManager.register(command.name,
                                    command.id,
                                    handler.handle.bind(handler, command.keyBinding));

            menus.addMenuItem(command.id);
        }

        // @todo: using setTimeout since keybinding module takes some time to load        
        window.setTimeout(function () {
            menus.addMenuItem(Menus.DIVIDER);
            commands.forEach(removeBinding);
            commands.forEach(register);
            commands.forEach(addBinding);
        }, 500);
         
    });
});