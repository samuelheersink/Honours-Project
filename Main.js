/*jslint browser*/
/*jslint es6*/
/*global window*/

// Constants
var STATE_RADIUS = 30;
var SELF_LOOP_RADIUS = 21;
var LAMBDA = "λ";

// Global ID function
function ID() {
    "use strict";
    if (isNaN(ID.value)) {
        ID.value = 0;
    }
    ID.value = ID.value + 1;
    return ID.value;
}

//Utility function to get click coordinates on canvas
var getCursorPosition = function (event) {
    "use strict";
    var canvas = document.getElementById("graphCanvas");
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.y;
    return {x, y};
};

// The Transition class handles the status and operations of a givenn transition. Generates a new ID unless one is provided.
var Transition = function (label, fromID, toID, xFrom, yFrom, xTo, yTo, canvasContext) {
    "use strict";
    var transition = {};
    transition.label = label;
    transition.fromID = fromID;
    transition.toID = toID;
    transition.xFrom = xFrom;
    transition.xTo = xTo;
    transition.yFrom = yFrom;
    transition.yTo = yTo;
    transition.canvas = canvasContext;
    transition.id = ID();

    //Transition Methods
    //X location of the label, halfway along the transition
    transition.labelX = function () {
        //Return a different value if this is a loop
        if (transition.toID === transition.fromID) {
            return xFrom - STATE_RADIUS;
        }
        return xFrom + ((xTo - xFrom) / 2) + 2;
    };
    //Y location of the label, halfway along the transition
    transition.labelY = function () {
        //Add the radiI if this is a loop
        if (transition.toID === transition.fromID) {
            return yFrom - STATE_RADIUS;
        }
        return yFrom + ((yTo - yFrom) / 2) - 2;
    };
    //Draw renders this transition on the graph.
    transition.draw = function () {
        //Restore the default context
        transition.canvas.restore();
        //Get the from and to states from their IDs
        var thisFrom = window.theGraph.getStateById(transition.fromID);
        var thisTo = window.theGraph.getStateById(transition.toID);
        //Special case for loops to the same node
        if (thisFrom === thisTo) {
            //Loop center is the absolute north end of the state.
            var loopCenterX = thisFrom.x;
            var loopCenterY = thisFrom.y - STATE_RADIUS;
            var loopAngle = Math.acos(SELF_LOOP_RADIUS / (2 * (STATE_RADIUS)));
            //The loop start is the point at which the loop meets the state edge on the northeast
            var loopStart = Math.PI - ((Math.PI / 2) - loopAngle);
            //The end is on the northwest
            var loopEnd = (Math.PI / 2) - loopAngle;
            transition.canvas.beginPath();
            transition.canvas.arc(loopCenterX, loopCenterY, SELF_LOOP_RADIUS, loopStart, loopEnd);
            transition.canvas.stroke();
            //Draw the label halfway through the line, Grey so it stands out
            transition.canvas.save();
            transition.canvas.textBaseline = "bottom";
            transition.canvas.font = "16px Helvetica";
            transition.canvas.fillStyle = "#404142";
            transition.canvas.fillText(transition.label, loopCenterX, loopCenterY - SELF_LOOP_RADIUS);
            transition.canvas.restore();
        } else {
            //Draw the arrow
            transition.canvas.beginPath();
            var headlen = 10;   // length of head in pixels
            var angle = Math.atan2(yTo - yFrom, xTo - xFrom);
            transition.canvas.moveTo(xFrom, yFrom);
            transition.canvas.lineTo(xTo, yTo);
            transition.canvas.lineTo(xTo - headlen * Math.cos(angle - Math.PI / 6), yTo - headlen * Math.sin(angle - Math.PI / 6));
            transition.canvas.moveTo(xTo, yTo);
            transition.canvas.lineTo(xTo - headlen * Math.cos(angle + Math.PI / 6), yTo - headlen * Math.sin(angle + Math.PI / 6));
            transition.canvas.stroke();
            //Draw the label halfway through the line, Grey so it stands out
            transition.canvas.save();
            transition.canvas.textBaseline = "bottom";
            transition.canvas.font = "16px Helvetica";
            transition.canvas.fillStyle = "#404142";
            transition.canvas.fillText(transition.label, transition.labelX(), transition.labelY());
            transition.canvas.restore();
        }
    };
    //Returns an XML representation of this transition for saving
    transition.toXML = function () {
        var XMLstring = "<transition>";
        XMLstring = XMLstring + "<label>" + transition.label + "</label>";
        XMLstring = XMLstring + "<fromID>" + transition.fromID + "</fromID>";
        XMLstring = XMLstring + "<toID>" + string(transition.toID) + "</toID>";
        XMLstring = XMLstring + "<xFrom>" + string(transition.xFrom) + "</xFrom>";
        XMLstring = XMLstring + "<xTo>" + string(transition.xTo) + "</xTo>";
        XMLstring = XMLstring + "<yFrom>" + string(transition.yFrom) + "</yFrom>";
        XMLstring = XMLstring + "<yTo>" + string(transition.yTo) + "</yTo>";
        XMLstring = XMLstring + "<id>" + string(transition.id) + "</id>";
        XMLstring = XMLstring + "</transition>";
        return XMLstring;
    };
    return transition;
};

// The State class handles the status and operations of a given state.
var State = function (type, label, x, y, canvasContext) {
    "use strict";
    var state = {};
    switch (type.toUpperCase()) {
        case "START":
            state.label = "START";
            state.type = "START";
            break;
        case "FINAL":
            state.label = "+";
            state.type = "FINAL";
            break;
        default:
            state.label = label;
            state.type = "INTERMEDIATE";
            break;
    }
    state.x = x;
    state.y = y;
    state.canvas = canvasContext;
    //Follows and precedes are arrays of state IDs
    state.follows = [];
    state.precedes = [];
    state.id = ID();

    //Methods
    //Draw function for the canvas
    state.draw = function () {
        //Draw the circle
        state.canvas.restore();
        state.canvas.beginPath();
        state.canvas.arc(state.x, state.y, STATE_RADIUS, 0, 2 * Math.PI);
        state.canvas.stroke();
        //Draw the label
        state.canvas.textAlign = "center";
        state.canvas.textBaseline = "middle";
        state.canvas.font = "17px Helvetica";
        state.canvas.fillText(state.label, state.x, state.y);
    };
    //Blue draw function for highlighting
    state.drawBlue = function () {
        //Save the context so we can reset it after
        state.canvas.save();
        //Draw the circle, but blue
        state.canvas.strokeStyle = "#4286f4";
        state.canvas.fillStyle = "#4286f4";
        state.canvas.lineWidth = 3;
        state.canvas.beginPath();
        state.canvas.arc(state.x, state.y, STATE_RADIUS, 0, 2 * Math.PI);
        state.canvas.stroke();
        //Draw the label
        state.canvas.textAlign = "center";
        state.canvas.textBaseline = "middle";
        state.canvas.font = "17px Helvetica";
        state.canvas.fillText(state.label, state.x, state.y);
        state.canvas.restore();
    };
    //Given another direction to point, find a point on the edge of the state for a transition arrow to start.
    state.arcTanOnEdge = function (farX, farY) {
        var diffX = farX - state.x;
        var diffY = farY - state.y;
        var angle = Math.atan2(diffY, diffX);
        var edgeX = state.x + STATE_RADIUS * Math.cos(angle);
        var edgeY = state.y + STATE_RADIUS * Math.sin(angle);
        //Return the x, y of the point on the edge of the circle
        return [edgeX, edgeY];
    };
    //Return the XML representation of the state, for saving
    state.toXML = function () {
        var XMLstring = "<state>";
        XMLstring = XMLstring + "<type>" + state.type + "</type>";
        XMLstring = XMLstring + "<x>" + string(state.x) + "</x>";
        XMLstring = XMLstring + "<y>" + string(state.y) + "</y>";
        XMLstring = XMLstring + "<follows>";
        state.follows.forEach(function (stateID) {
            XMLstring = XMLstring + string(stateID) + ", ";
        });
        XMLstring = XMLstring.slice(0, -2);
        XMLstring = XMLstring + "</follows>";
        XMLstring = XMLstring + "<precedes>";
        state.precedes.forEach(function (stateID) {
            XMLstring = XMLstring + string(stateID) + ", ";
        });
        XMLstring = XMLstring.slice(0, -2);
        XMLstring = XMLstring + "</precedes>";
        XMLstring = XMLstring + "</state>";
        return XMLstring;
    };
    //Changes a state into an intermediate state
    state.revertToIntermediate = function () {
        if (state.type === "START" || state.type === "FINAL") {
            state.type = "INTERMEDIATE";
            state.label = "";
        }
    }
    return state;
};

// The Graph class handles the top-level manipulation of the canvas objects.
var Graph = function (newCanvasName) {
    "use strict";
    var graph = {};
    graph.alphabet = ["a", "b"];
    graph.canvasName = newCanvasName;
    graph.states = [];
    graph.transitions = [];

    //Graph Methods
    //Return the canvas context so objects can draw themselves
    graph.getCanvasContext = function () {
        var theCanvas = document.getElementById(graph.canvasName);
        return theCanvas.getContext("2d");
    };
    //Draw the entire graph
    graph.draw = function () {
        //Save the default context so that we can restore it later
        graph.getCanvasContext().save();
        //Clear the canvas
        graph.clearCanvas();
        //Draw each state
        if (graph.states.length > 0) {
            graph.states.forEach(function (state) {
                state.draw();
            });
            //Draw each transition
            if (graph.transitions.length > 0) {
                graph.transitions.forEach(function (transition) {
                    transition.draw();
                });
            }
        }
    };
    //Add a transition between two states from and to, with a given label.
    //Calculates the start and end points of the transition from the locations of the states.
    //Returns the transition for future use.
    graph.addTransition = function (label, from, to) {
        //Add the states involved in this transition to their respective lists
        from.precedes.push(to.id);
        to.follows.push(from.id);
        //Get the points on the edge of each state for the transition arrows to be located
        var fromPoint = from.arcTanOnEdge(to.x, to.y);
        var toPoint = to.arcTanOnEdge(from.x, from.y);
        var xFrom = fromPoint[0];
        var yFrom = fromPoint[1];
        var xTo = toPoint[0];
        var yTo = toPoint[1];

        //Call the transition constructor with the rest of the information
        var newTransition = new Transition(label, from.id, to.id, xFrom, yFrom, xTo, yTo, graph.getCanvasContext());
        graph.transitions.push(newTransition);
        return newTransition;
    };
    //Add a new state to the graph of a given type with a specified label. Returns that state for future use.
    graph.addState = function (type, label, x, y) {
        //Check that the state is not too close to another
        var good = true;
        if (graph.states.length > 0) {
            graph.states.forEach(function (state) {
                if (Math.sqrt(Math.pow((state.x - x), 2) + Math.pow((state.y - y), 2)) < STATE_RADIUS * 2) {
                    good = false;
                    return undefined;
                }
            });
        }
        if (good) {
            var newState = new State(type, label, x, y, graph.getCanvasContext());
            graph.states.push(newState);
            return newState;
        }
    };
    //Get the set of final states of the graph.
    graph.getFinalStates = function () {
        var finalStates = [];
        graph.states.forEach(function (state) {
            if (state.type === "FINAL") {
                finalStates.push(state);
            }
        });
        return finalStates;
    };
    //Get the set of start states of the graph
    graph.getStartStates = function () {
        var startStates = [];
        graph.states.forEach(function (state) {
            if (state.type === "START") {
                startStates.push(state);
            }
        });
        return startStates;
    };
    //Delete a given state from the graph
    graph.removeState = function (toDelete) {
        //Remove all the transitions attached to this state
        graph.transitions.forEach(function (transition) {
            if (transition.fromID === toDelete.id || transition.toID === toDelete.id) {
                graph.removeTransition(transition);
            }
        });
        //Remove the selected state
        var newStates = [];
        var success = false;
        graph.states.forEach(function (state) {
            if (state !== toDelete) {
                newStates.push(state);
            } else {
                success = true;
            }
        });
        graph.states = newStates;
        return success;
    };
    //Delete a given transition from the graph
    graph.removeTransition = function (toDelete) {
        //Remove the selected transition
        var newTransitions = [];
        var success = false;
        graph.transitions.forEach(function (transition) {
            if (transition !== toDelete) {
                newTransitions.push(transition);
            } else {
                success = true;
            }
        });
        //Remove the first incidence of the To state from the From state's Precedes list, and the first incidence of the From state from the To state's Follows list
        var newPrecedesList = [];
        var deleted = false;
        graph.getStateById(toDelete.fromID).precedes.forEach(function (precedingStateID) {
            if (precedingStateID !== toDelete.toID || deleted) {
                newPrecedesList.push(precedingStateID);
            } else {
                deleted = true;
            }
        });
        graph.getStateById(toDelete.fromID).precedes = newPrecedesList;
        var newFollowsList = [];
        deleted = false;
        graph.getStateById(toDelete.toID).follows.forEach(function (followStateID) {
            if (followStateID !== toDelete.fromID || deleted) {
                newFollowsList.push(followStateID);
            } else {
                deleted = true;
            }
        });
        graph.getStateById(toDelete.toID).follows = newFollowsList;
        graph.transitions = newTransitions;
        return success;
    };
    //Clear the canvas for redrawing
    graph.clearCanvas = function () {
        var theCanvas = document.getElementById(graph.canvasName);
        theCanvas.getContext("2d").clearRect(0, 0, theCanvas.width, theCanvas.height);
    };
    //Return the state matching a given ID.
    graph.getStateById = function (id) {
        var match;
        graph.states.forEach(function (state) {
            if (state.id === id) {
                match = state;
            }
        });
        return match;
    };
    //Return the transition matching a given ID.
    graph.getTransitionById = function (id) {
        var match;
        graph.transitions.forEach(function (transition) {
            if (transition.id === id) {
                match = transition;
            }
        });
        return match;
    };
    //Returns the ID of the state or transition within the state radius (30px) of a given x and y coordinate
    graph.getIDOfObjectAt = function (x, y) {
        var elementID;
        var found = false;
        //First try the states
        graph.states.forEach(function (state) {
            if (!found) {
                if (Math.abs(state.x - x) < STATE_RADIUS && Math.abs(state.y - y) < STATE_RADIUS) {
                    elementID = state.id;
                    found = true;
                }
            }
        });
        //Then try the transitions
        graph.transitions.forEach(function (transition) {
            if (!found) {
                if (Math.abs(transition.labelX() - x) < STATE_RADIUS && Math.abs(transition.labelY() - y) < STATE_RADIUS) {
                    elementID = transition.id;
                    found = true;
                }
            }
        });
        return elementID;
    };
    //Return an XML representation of the graph for saving
    graph.toXML = function () {
        var XMLstring = "<graph>";
        XMLstring = XMLstring + "<alphabet>";
        graph.alphabet.forEach(function (alpha) {
            XMLstring = XMLstring + alpha + ", ";
        });
        XMLstring = XMLstring.slice(0, -2);
        XMLstring = XMLstring + "</alphabet>";
        graph.states.forEach(function (state) {
            XMLstring = XMLstring + state.toXML();
        });
        graph.transitions.forEach(function (transition) {
            XMLstring = XMLstring + transition.toXML();
        });
        return XMLstring;
    };
    //Wipes the slate clean. Only the alphabet is retained.
    graph.clearGraph = function () {
        graph.states = [];
        graph.transitions = [];
        graph.clearCanvas();
    };
    //Copies this graph into the provided graph object, for the checkpoint method
    graph.clone = function (copy) {
        //Alphabet and canvas name
        copy.alphabet = graph.alphabet.concat();
        copy.canvasName = graph.canvasName;
        //Copy each of the states individually
        copy.states = [];
        graph.states.forEach(function (state) {
            var copyState = new State(state.type, state.label, state.x, state.y);
            copyState.id = state.id;
            copyState.follows = state.follows.concat();
            copyState.precedes = state.precedes.concat();
            copyState.canvas = state.canvas;
            copy.states.push(copyState);
        });
        //Copy each of the transitions individually
        copy.transitions = [];
        graph.transitions.forEach(function (transition) {
            var copyTransition = new Transition(transition.label, transition.fromID, transition.toID,
                    transition.xFrom, transition.yFrom, transition.xTo, transition.yTo, transition.canvas);
            copy.transitions.push(copyTransition);
        });
    };
    //Returns the transition with the specified source and destination IDs
    graph.getTransitionBySubjects = function (fromID, toID) {
        var match = {};
        graph.transitions.forEach(function (transition) {
            if (transition.fromID === fromID && transition.toID === toID) {
                match = transition;
            }
        });
        return match;
    };
    return graph;
};

//Palette Methods
//#region
//Copies the current graph to the old graph to save it for undoing
var checkpoint = function () {
    "use strict";
    window.theGraph.clone(window.oldGraph);
};

//Handles the mouseclick on the canvas to create a start state at the location of the mousedown event
var createStartState = function (event) {
    "use strict";
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    checkpoint();
    var newState = window.theGraph.addState("START", "START", clickX, clickY);
    if (newState !== undefined) {
        window.theGraph.draw();
        window.paletteController.disableStartState();
        return newState;
    }
};

//Handles the mouseclick on the canvas to create a start state at the location of the mousedown event
var createFinalState = function (event) {
    "use strict";
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    checkpoint();
    var newState = window.theGraph.addState("FINAL", "+", clickX, clickY);
    if (newState !== undefined) {
        window.theGraph.draw();
        window.paletteController.disableFinalState();
    }
};

//Handles the mouseclick on the canvas to create a start state at the location of the mousedown event
var createState = function (event) {
    "use strict";
    var labelText = document.getElementById("inputLabel").value;
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    checkpoint();
    var newState = window.theGraph.addState(labelText, labelText, clickX, clickY);
    if (newState !== undefined) {
        window.theGraph.draw();
        window.paletteController.disableNewState();
    }
};

//Handles the mouseclick to select a state to begin a transition from. Turns it blue.
var selectTransitionStartState = function (event) {
    "use strict";
    var graph = window.theGraph;
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    var objectID = graph.getIDOfObjectAt(clickX, clickY);
    if (objectID) {
        var stateID = 0;
        stateID = graph.getStateById(objectID).id;
        graph.getStateById(objectID).drawBlue();
        window.paletteController.nextTransitionState(stateID);
        return objectID;
    }
    //If something goes wrong, return 0
    return 0;
};

//Handles the mouseclick to select a state to terminate a transition.
var selectTransitionFinalState = function (event) {
    "use strict";
    var graph = window.theGraph;
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    var objectID = graph.getIDOfObjectAt(clickX, clickY);
    if (objectID) {
        var stateID = 0;
        stateID = graph.getStateById(objectID).id;
        graph.getStateById(objectID).drawBlue();
        var labelText = document.getElementById("inputLabel").value;
        var fromState = graph.getStateById(window.paletteController.transitionFromID);
        var toState = graph.getStateById(stateID);
        checkpoint();
        graph.addTransition(labelText, fromState, toState);
        window.paletteController.disableFinalTransition();
    }
    //If something goes wrong, return 0
    return 0;
};

//Handles the mouseclick to select an element (state or transition) for deletion
var deleteObject = function (event) {
    "use strict";
    var graph = window.theGraph;
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    var objectID = graph.getIDOfObjectAt(clickX, clickY);
    var success = false;
    //Try to remove the object from the list of states. If it fails, try the list of transitions.
    checkpoint();
    if (objectID) {
        var toDelete = graph.getStateById(objectID);
        if (toDelete) {
            success = graph.removeState(toDelete);
        }
        if (!success) {
            success = graph.removeTransition(graph.getTransitionById(objectID));
        }
        if (success) {
            window.theGraph.draw();
            window.paletteController.disableDelete();
        }
    }
};

//Begins the process of converting the graph to a regular expression.
var startConversion = function () {
    "use strict";
    //Verify that the graph has at least one start state. This is a formal requirement of the transition graph.
    if (window.theGraph.getStartStates().length === 0) {
        document.getElementById("messageText").innerHTML = "A proper transition graph requires at least one start state";
        return;
    }
    //Verify the regex of the graph labels
    var success = true;
    var listOfFailures = [];
    window.theGraph.transitions.forEach(function (transition) {
        if (!regEx(cleanForVerification(transition.label))) {
            //If this particular transition's label is not proper regex, we can't proceed. Add it to the list.
            listOfFailures.push(transition.label);
            success = false;
        }
    });
    if (!success) {
        //Show the message box with the offending labels
        var errorMessage = "Some transition labels are not proper regular expressions:";
        listOfFailures.forEach(function (label) {
            errorMessage = errorMessage + " \"" + label + "\"";
        });
        document.getElementById("messageText").innerHTML = errorMessage;
        //Exit
        return;
    }
    //Clear the message box if we are good to continue
    document.getElementById("messageText").innerHTML = "";
    //Disable the palette
    Array.from(document.getElementsByClassName("paletteButton")).forEach(function (elem) {
        elem.disabled = true;
    });
    document.getElementById("divPalette").style.backgroundColor = "#cee1ff";
    //Show the conversion elements
    Array.from(document.getElementsByClassName("conversion")).forEach(function (elem) {
        elem.style.visibility = "visible";
    });
};

//Converts the canvas to a png and displays it in the output
var toPNG = function () {
    "use strict";
    var canvas = document.getElementById("graphCanvas");
    var img = canvas.toDataURL("graph.png");
    var elem = document.createElement("img");
    elem.setAttribute("src", img);
    elem.style.userSelect = "none";
    //Clear the output, then add the new image to the output
    document.getElementById("imageOutput").innerHTML = "";
    document.getElementById("imageOutput").appendChild(elem);
};

//Public class that contains palette functions and assigns event listeners to the canvas
var PaletteController = function () {
    "use strict";
    var paletteController = {};

    paletteController.startStateButton = document.getElementById("btnAddStart");
    paletteController.newStateButton = document.getElementById("btnAddState");
    paletteController.finalStateButton = document.getElementById("btnAddFinal");
    paletteController.transitionButton = document.getElementById("btnAddTransition");
    paletteController.alphabetButton = document.getElementById("btnAlphabet");
    paletteController.deleteButton = document.getElementById("btnDelete");
    paletteController.canvas = document.getElementById("graphCanvas");
    paletteController.transitionFromID = 0;
    paletteController.startStateActive = false;
    paletteController.newStateActive = false;
    paletteController.finalStateActive = false;
    paletteController.newTransitionActive = false;
    paletteController.newTransitionSecondState = false;
    paletteController.alphabetActive = false;
    paletteController.deleteActive = false;

    //Palette Controller methods
    paletteController.disableStartState = function () {
        paletteController.startStateButton.classList.remove("paletteButtonSelected");
        paletteController.canvas.removeEventListener("click", createStartState);
        paletteController.startStateActive = false;
    };
    paletteController.disableNewState = function () {
        //Hide the input elements
        var inputElements = Array.from(document.getElementsByClassName("input"));
        inputElements.forEach(function (elem) {
            elem.style.visibility = "hidden";
        });
        paletteController.newStateButton.classList.remove("paletteButtonSelected");
        paletteController.canvas.removeEventListener("click", createState);
        paletteController.newStateActive = false;
    };
    paletteController.disableFinalState = function () {
        paletteController.finalStateButton.classList.remove("paletteButtonSelected");
        paletteController.canvas.removeEventListener("click", createFinalState);
        paletteController.finalStateActive = false;
    };
    paletteController.disableTransition = function () {
        //Hide the input elements
        var inputElements = Array.from(document.getElementsByClassName("input"));
        inputElements.forEach(function (elem) {
            elem.style.visibility = "hidden";
        });
        paletteController.transitionButton.classList.remove("paletteButtonSelected");
        paletteController.canvas.removeEventListener("click", selectTransitionStartState);
        paletteController.newTransitionActive = false;
    };
    paletteController.disableFinalTransition = function () {
        //Hide the input elements
        var inputElements = Array.from(document.getElementsByClassName("input"));
        inputElements.forEach(function (elem) {
            elem.style.visibility = "hidden";
        });
        paletteController.transitionButton.classList.remove("paletteButtonSelected");
        paletteController.canvas.removeEventListener("click", selectTransitionFinalState);
        paletteController.newTransitionActive = false;
        paletteController.newTransitionSecondState = false;
        paletteController.transitionFromID = 0;
        //re-draw the graph to unblue the selected state
        window.theGraph.draw();
    };
    paletteController.disableDelete = function () {
        paletteController.deleteButton.classList.remove("paletteButtonSelected");
        paletteController.canvas.removeEventListener("click", deleteObject);
        paletteController.deleteActive = false;
    };
    paletteController.disableAlphabet = function () {
        //Change the input elements back
        document.getElementById("labelLabel").innerText = "Label:";
        document.getElementById("inputLabel").value = "";
        //Hide the input elements
        var inputElems = Array.from(document.getElementsByClassName("input"));
        inputElems.forEach(function (elem) {
            elem.style.visibility = "hidden";
        });
        paletteController.alphabetButton.classList.remove("paletteButtonSelected");
        paletteController.alphabetActive = false;
    };
    //Disables whatever button is currently active
    paletteController.disableActiveButton = function () {
        if (paletteController.startStateActive) {
            paletteController.disableStartState();
        } else if (paletteController.alphabetActive) {
            paletteController.disableAlphabet();
        } else if (paletteController.newStateActive) {
            paletteController.disableNewState();
        } else if (paletteController.finalStateActive) {
            paletteController.disableFinalState();
        } else if (paletteController.newTransitionActive) {
            paletteController.disableTransition();
        } else if (paletteController.newTransitionSecondState) {
            paletteController.disableFinalTransition();
        } else if (paletteController.deleteActive) {
            paletteController.disableDelete();
        }
    };
    //Saves the first state in a transition and adds the event listener for the second one
    paletteController.nextTransitionState = function (firstStateID) {
        paletteController.transitionFromID = firstStateID;
        paletteController.newTransitionActive = false;
        paletteController.newTransitionSecondState = true;
        paletteController.canvas.removeEventListener("click", selectTransitionStartState);
        paletteController.canvas.addEventListener("click", selectTransitionFinalState);
    };
    //The button clicks
    paletteController.alphabetClick = function (event) {
        if (!paletteController.alphabetActive) {
            paletteController.disableActiveButton();
            paletteController.alphabetButton.classList.add("paletteButtonSelected");
            paletteController.alphabetActive = true;
            //Change the input elements
            document.getElementById("labelLabel").innerText = "Alphabet:";
            document.getElementById("inputLabel").value = window.theGraph.alphabet.toString();
            //Show the input elements
            var inputElements = Array.from(document.getElementsByClassName("input"));
            inputElements.forEach(function (elem) {
                elem.style.visibility = "visible";
            });
        } else {
            //Regular expression matches a sequence of letters, upper or lower case, separated by commas and at most one space
            var re = /^([A-Za-z](,\s?[A-Za-z])*)$/;
            var input = document.getElementById("inputLabel").value;
            var match = re.test(input);
            //If we match, this is the new alphabet
            if (match) {
                var newAlpha = input.split(",");
                newAlpha.forEach(function (char, i) {
                    newAlpha[i] = char.trim();
                });
                window.theGraph.alphabet = newAlpha;
                paletteController.disableAlphabet();
            } else {
                document.getElementById("messageText").innerHTML = "The alphabet should just be letters separated by commas.";
            }
        }
    };
    paletteController.startStateClick = function (event) {
        if (!paletteController.startStateActive) {
            paletteController.disableActiveButton();
            paletteController.startStateButton.classList.add("paletteButtonSelected");
            paletteController.canvas.addEventListener("click", createStartState, false);
            paletteController.startStateActive = true;
        } else {
            paletteController.disableStartState();
        }
    };
    paletteController.newStateClick = function (event) {
        if (!paletteController.newStateActive) {
            paletteController.disableActiveButton();
            paletteController.newStateButton.classList.add("paletteButtonSelected");
            //Show the label input elements
            var inputElements = Array.from(document.getElementsByClassName("input"));
            inputElements.forEach(function (elem) {
                elem.style.visibility = "visible";
            });
            document.getElementById("inputLabel").value = "";
            paletteController.canvas.addEventListener("click", createState);
            paletteController.newStateActive = true;
        } else {
            paletteController.disableNewState();
        }
    };
    paletteController.finalStateClick = function (event) {
        if (!paletteController.finalStateActive) {
            paletteController.disableActiveButton();
            paletteController.finalStateButton.classList.add("paletteButtonSelected");
            paletteController.canvas.addEventListener("click", createFinalState);
            paletteController.finalStateActive = true;
        } else {
            paletteController.disableFinalState();
        }
    };
    paletteController.transitionClick = function (event) {
        if (!paletteController.newTransitionActive) {
            paletteController.disableActiveButton();
            paletteController.transitionButton.classList.add("paletteButtonSelected");
            paletteController.canvas.addEventListener("click", selectTransitionStartState);
            paletteController.newTransitionActive = true;
            var inputElements = Array.from(document.getElementsByClassName("input"));
            inputElements.forEach(function (elem) {
                elem.style.visibility = "visible";
            });
            document.getElementById("inputLabel").value = LAMBDA;
        } else {
            paletteController.disableTransition();
        }
    };
    paletteController.deleteClick = function (event) {
        if (!paletteController.deleteActive) {
            paletteController.disableActiveButton();
            paletteController.deleteButton.classList.add("paletteButtonSelected");
            paletteController.canvas.addEventListener("click", deleteObject);
            paletteController.deleteActive = true;
        } else {
            paletteController.disableDelete();
        }
    };
    paletteController.clearClick = function (event) {
        checkpoint();
        window.theGraph.clearGraph();
    };
    paletteController.undoClick = function (event) {
        window.oldGraph.clone(window.theGraph);
        window.theGraph.draw();
    };
    return paletteController;
};
//#endregion

//XML
//#region
// // The load method handles loading a graph from a local XML file. Currently does not work. Given that we can't save to file, reading from
// // file is also likely untenable. Pasting into a textbox, or grabbing directly from the clipboard, is a more realistic approach.
// var loadXML = function () {
//     "use strict";
//     var messageBox = document.getElementById("messages");
//     try {
//         var file = document.getElementById("xmlToLoad").files[0];
//         var fReader = new FileReader();
//         var xmlAsText = fReader.readAsText(file);
//         messageBox.text = xmlAsText;
//     } catch (error) {
//         messageBox.text = "Error reading XML file: " + error.message;
//     }
// };

//// Save XML also currently does not work. The graph "toXML" function works fine, 
//// but saving the file seems to be very difficult, if not impossible, in vanilla javascript.
// var saveXML = function () {
//     "use strict";
//     var graphAsXML = window.theGraph.toXML();
//     var blob = new Blob(graphAsXML, {type: "text/xml"});
//     saveAs(blob, "KleeneExport.xml");
// };
//#endregion

//String verification
//#region
// Verifies whether a character is in the alphabet or is lambda
function alphabetContainsCharacter(char) {
    "use strict";
    var ret = false;
    window.theGraph.alphabet.forEach(function (alpha) {
        if (alpha === char) {
            ret = true;
        }
    });
    //Else try lambda
    if (char === LAMBDA) {
        ret = true;
    }
    return ret;
}
//Preconditions: remove all whitespace and insert a "." between each terminal character and a neighbour like so:
//[b(] becomes [b.(], [)b] becomes [).b], [ab] becomes [a.b], [)(] becomes [).(], [*a] becomes [*.a], [*(] becomes [*.(]
function cleanForVerification(string) {
    "use strict";
    //Remove whitespace
    var cleanString = string.replace(/\ /g, '');
    var i = 0;
    var insertDot = false;
    // Go through each pair of characters in the string and check for each case of concatenation
    while (i < cleanString.length - 1) {
        insertDot = false;
        if (alphabetContainsCharacter(cleanString.charAt(i))) {
            if (alphabetContainsCharacter(cleanString.charAt(i + 1))) {
                //ab
                insertDot = true;
            } else if (cleanString.charAt(i + 1) === "(") {
                //a(
                insertDot = true;
            }
        } else if (cleanString.charAt(i) === ")") {
            if (cleanString.charAt(i + 1) === "(") {
                //)(
                insertDot = true;
            } else if (alphabetContainsCharacter(cleanString.charAt(i + 1))) {
                //)a
                insertDot = true;
            }
        } else if (cleanString.charAt(i) === "*") {
            if (cleanString.charAt(i + 1) === "(") {
                //*(
                insertDot = true;
            } else if (alphabetContainsCharacter(cleanString.charAt(i + 1))) {
                //*a
                insertDot = true;
            }
        }
        //Insert the dot after the current character
        if (insertDot) {
            cleanString = cleanString.slice(0, i + 1) + "." + cleanString.slice(i + 1);
            i = i + 1;
        }
        i = i + 1;
    }
    return cleanString;
}
// I implement a context-free grammar to solve this problem
// regEx --> concat | regEx + concat
// concat --> brack | concat . brack
// brack --> simple | brack* | (regEx)
// simple --> {terminals of alphabet} | lambda
function regEx(string) {
    "use strict";
    //regEx --> concat
    if (concat(string)) {
        return true;
    }
    //regEx --> regEx + concat
    //We need to check each "+" in the string to try and satisfy this rule
    var loop = true;
    var result = false;
    var concatPart = "";
    var regexPart = "";
    var unionIndex = string.indexOf("+");
    while (loop) {
        //Try the next union
        if (unionIndex > 0) {
            regexPart = string.slice(0, unionIndex);
            concatPart = string.slice(unionIndex + 1);
            if (regEx(regexPart) && concat(concatPart)) {
                //We found our result and don't need to check anymore
                result = true;
                loop = false;
            }
        } else {
            //Index = 0 so there are no more symbols to check
            loop = false;
        }
        //Find the next symbol to check
        unionIndex = string.indexOf("+", unionIndex + 1);
    }

    return result;
}
function concat(string) {
    "use strict";
    //concat --> brack
    if (brack(string)) {
        return true;
    }
    //concat --> concat . brack
    //We need to check every single "." in the string. We loop through all of the "." symbols from the beginning
    ///to find an arrangement that satisfies the rule.
    var loop = true;
    var result = false;
    var concatIndex = string.indexOf(".");
    var concatPart = "";
    var brackPart = "";
    while (loop) {
        if (concatIndex > 0) {
            concatPart = string.slice(0, concatIndex);
            brackPart = string.slice(concatIndex + 1);
            if (concat(concatPart) && brack(brackPart)) {
                //We found our result and no longer have to check anymore
                result = true;
                loop = false;
            }
        } else {
            //There are no more to check so we finish the loop
            loop = false;
        }
        //Find the next symbol to check
        concatIndex = string.indexOf(".", concatIndex + 1);
    }
    return result;
}
function brack(string) {
    "use strict";
    //brack --> simple
    if (simple(string)) {
        return true;
    }
    //brack --> brack*
    if (string.endsWith("*")) {
        if (brack(string.slice(0, string.length - 1))) {
            return true;
        }
    }
    //brack --> (regEx)
    if (string[0] === "(" && string.endsWith(")")) {
        var insideBrackets = string.slice(1, string.length - 1);
        if (regEx(insideBrackets)) {
            return true;
        }
    }
    return false;
}
function simple(string) {
    "use strict";
    //Check terminals of alphabet and lambda
    var match = false;
    if (alphabetContainsCharacter(string)) {
        match = true;
    }
    return match;
}
//#endregion

//Conversion to regular expression
//#region

//Step 1, create a unique start state at a given location, connected to all the old start states using lambda transitions
var createUniqueStartState = function (x, y) {
    "use strict";
    var graph = window.theGraph;
    var startStateIDs = [];
    graph.states.forEach(function (state) {
        if (state.type === "START") {
            startStateIDs.push(state.id);
        }
    });
    //If we have more than one start state, revert all the states to intermediate and create a new start connected to all the others.
    if (startStateIDs.length > 1) {
        //Add the new start state at the given location
        var newStart = graph.addState("START", "START", x, y);
        startStateIDs.forEach(function (stateID) {
            var oldStart = graph.getStateById(stateID);
            oldStart.revertToIntermediate();
            graph.addTransition(LAMBDA, newStart, oldStart);
        });
    }
    finishConversionAction();
};

//Wrapper for step 1 to get the click coordinates
var uniqueStartStateLocationClick = function (event) {
    "use strict";
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    checkpoint();
    createUniqueStartState(clickX, clickY);
};

//Button click for step 1
var uniqueStartStateButtonClick = function () {
    "use strict";
    startConversionAction(uniqueStartStateLocationClick, "Select a location for the new start state");
    window.conversionController.uniqueStartStateSelectActive = true;
};

//Step 2, create a unique final state at a given location, connected to all the old final states using lambda transitions
var createUniqueFinalState = function (x, y) {
    "use strict";
    var graph = window.theGraph;
    var finalStateIDs = [];
    graph.states.forEach(function (state) {
        if (state.type === "FINAL") {
            finalStateIDs.push(state.id);
        }
    });
    //If we have more than one final state, revert all the states to intermediate and create a new start connected to all the others
    if (finalStateIDs.length > 1) {
        //Add the new final state in the top right corner
        var newFinal = graph.addState("FINAL", "FINAL", x, y);
        finalStateIDs.forEach(function (stateID) {
            var oldFinal = graph.getStateById(stateID);
            oldFinal.revertToIntermediate();
            graph.addTransition(LAMBDA, oldFinal, newFinal);
        });
    }
    finishConversionAction();
};

//Wrapper for step 2 to get the click coordinates
var uniqueFinalStateLocationClick = function (event) {
    "use strict";
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    checkpoint();
    createUniqueFinalState(clickX, clickY);
};

//Button click for step 2
var uniqueFinalStateButtonClick = function () {
    "use strict";
    startConversionAction(uniqueFinalStateLocationClick, "Select a location for the new final state");
    window.conversionController.uniqueFinalStateSelectActive = true;
};

//Step 3, combine all transitions with the same source and destination (also the button click)
var combineTransitions = function () {
    "use strict";
    var graph = window.theGraph;
    var deleted = true;
    while (deleted) {
        deleted = false;
        graph.transitions.forEach(function (transition) {
            if (!deleted) {
                graph.transitions.forEach(function (transition2) {
                    //If the transitions' from and to state IDs match and they are not the same state, consolidate their labels
                    if (transition.fromID === transition2.fromID && transition.toID === transition2.toID && transition.id !== transition2.id) {
                        transition.label = transition.label + "+" + transition2.label;
                        graph.removeTransition(transition2);
                        //When we delete something we need to update the lists and restart the process
                        deleted = true;
                    }
                });
            }
        });
        //If we make it through the whole list without deleting anything then we are finished
    }
    //Draw the graph and see if we are finished the conversion
    graph.draw();
    checkCompletion();
};

//Step 4, remove all single-state loops (also the button click)
var removeLoops = function () {
    "use strict";
    var graph = window.theGraph;
    graph.transitions.forEach(function (transition) {
        //For all loops
        if (transition.fromID === transition.toID) {
            //Create the Kleene star of this label
            var starred = "(" + transition.label + ")*";
            // Find all the other transitions with the same destination
            var editList = [];
            graph.transitions.forEach(function (transition2) {
                if (transition2.toID === transition.toID && transition2.id !== transition.id) {
                    editList.push(transition2.id);
                }
            });
            // Add the starred label to the end of those transitions
            if (editList.length > 0) {
                editList.forEach(function (toChangeID) {
                    var transitionLabel = graph.getTransitionById(toChangeID).label;
                    graph.getTransitionById(toChangeID).label = transitionLabel + starred;
                });
            } else {
                //If there are no other transitions with the same destination we need to add this label to the start of all the out-transitions
                graph.transitions.forEach(function (transition2) {
                    if (transition2.fromID === transition.fromID && transition2.id !== transition.id) {
                        editList.push(transition2.id);
                    }
                });
                editList.forEach(function (toChangeID) {
                    var transitionLabel = graph.getTransitionById(toChangeID).label;
                    graph.getTransitionById(toChangeID).label = starred + transitionLabel;
                });
            }
            //Finally, remove the loop from the graph
            graph.removeTransition(transition);
        }
    });
    graph.draw();
    checkCompletion();
};

//Step 5, remove an intermediate state, adding transitions between all preceding and following states
var eliminateIntermediateState = function (stateID) {
    "use strict";
    var graph = window.theGraph;
    var toRemove = graph.getStateById(stateID);
    var quit = false;
    //Check that this state doesn't have a loop on it
    toRemove.precedes.forEach(function (precedeStateID) {
        if (precedeStateID === toRemove.id) {
            //If it does, we're finished
            document.getElementById("messageText").innerHTML = "Remove loops first!";
            finishConversionAction();
            quit = true;
        }
    });
    if (quit) {
        return;
    }
    if (toRemove.type === "INTERMEDIATE") {
        //Add transitions between each of the preceding and each of the following states
        toRemove.follows.forEach(function (precedeStateID) {
            //Get the label of the transition from this state to the state to remove
            var precedeLabel = graph.getTransitionBySubjects(precedeStateID, stateID).label;
            toRemove.precedes.forEach(function (followStateID) {
                //Get the label of the transition from the state to remove to this one
                var followLabel = graph.getTransitionBySubjects(stateID, followStateID).label;
                //Concatenate the two labels and create a new transition
                var combinedLabel = "(" + precedeLabel + ")(" + followLabel + ")";
                graph.addTransition(combinedLabel, graph.getStateById(precedeStateID), graph.getStateById(followStateID));
            });
        });
        //Finally, remove the state
        graph.removeState(graph.getStateById(stateID));
        finishConversionAction();
    }
};

//Wrapper for step 5 to get the coordinates of the click and the selected state
var eliminateIntermediateStateLocationClick = function (event) {
    "use strict";
    var cursorCoordinates = getCursorPosition(event);
    var clickX = cursorCoordinates.x;
    var clickY = cursorCoordinates.y;
    var objectID = window.theGraph.getIDOfObjectAt(clickX, clickY);
    var theState = window.theGraph.getStateById(objectID);
    if (theState) {
        eliminateIntermediateState(objectID);
    }
};

//Button click for step 5
var eliminateIntermediateStateButtonClick = function () {
    "use strict";
    startConversionAction(eliminateIntermediateStateLocationClick, "Select an intermediate state to eliminate.");
    window.conversionController.eliminateIntermediateStateSelectActive = true;
};

//Disable conversion buttons while a state is being chosen or placed
var disableConversionButtons = function () {
    "use strict";
    var buttons = document.getElementsByClassName("conversionButton");
    Array.from(buttons).forEach(function (button) {
        button.disabled = true;
    });
};

//Enable all conversion buttons
var enableConversionButtons = function () {
    "use strict";
    var buttons = document.getElementsByClassName("conversionButton");
    Array.from(buttons).forEach(function (button) {
        button.disabled = false;
    });
};

//Called by the actions that require choice to add their listeners and disable things
var startConversionAction = function (listener, textboxContent) {
    "use strict";
    //Add the event listener to the canvas
    document.getElementById("graphCanvas").addEventListener("click", listener, false);
    //Change the textbox
    document.getElementById("messageText").innerHTML = textboxContent;
    //Disable the conversion actions
    disableConversionButtons();
    //Enable the cancel button
    document.getElementById("btnCancel").disabled = false;
};

//Called by the actions that require choice, to remove their listeners and reenable things
var finishConversionAction = function () {
    "use strict";
    //Draw the graph
    window.theGraph.draw();
    //Remove the event listener
    var listener = window.conversionController.getActiveListener();
    document.getElementById("graphCanvas").removeEventListener("click", listener, false);
    //Reenable the buttons
    enableConversionButtons();
    //Clear the message box
    document.getElementById("messageText").innerHTML = "";
    //Disable the cancel button
    document.getElementById("btnCancel").disabled = true;
    //Reset the controller
    window.conversionController.reset();
    //Check if conversion is finished
    checkCompletion();
};

//Definition of the button controller object for storing the current action.
var ConversionController = function () {
    "use strict";
    var conversionController = {};

    conversionController.uniqueStartStateSelectActive = false;
    conversionController.uniqueFinalStateSelectActive = false;
    conversionController.eliminateIntermediateStateSelectActive = false;

    //Return the currently active event listener for the canvas
    conversionController.getActiveListener = function () {
        if (conversionController.uniqueStartStateSelectActive) {
            return uniqueStartStateLocationClick;
        }
        if (conversionController.uniqueFinalStateSelectActive) {
            return uniqueFinalStateLocationClick;
        }
        if (conversionController.eliminateIntermediateStateSelectActive) {
            return eliminateIntermediateStateLocationClick;
        }
    };

    //Disable the currently active conversion action
    conversionController.reset = function () {
        conversionController.uniqueStartStateSelectActive = false;
        conversionController.uniqueFinalStateSelectActive = false;
        conversionController.eliminateIntermediateStateSelectActive = false;
    };
    return conversionController;
};

//Exits the conversion process
var quitConversion = function () {
    "use strict";
    //Activate the palette
    Array.from(document.getElementsByClassName("paletteButton")).forEach(function (elem) {
        elem.disabled = false;
    });
    //Reset the palette backcolour
    document.getElementById("divPalette").style.backgroundColor = "transparent";
    //Hide the conversion elements
    Array.from(document.getElementsByClassName("conversion")).forEach(function (elem) {
        elem.style.visibility = "hidden";
    });
};

//Checks whether or not the conversion is finished and outputs the regular expression if it is.
var checkCompletion = function () {
    "use strict";
    //Check that there are only two states and a single transition
    if (window.theGraph.states.length === 2 && window.theGraph.transitions.length < 2) {
        //Get the label text
        if (window.theGraph.states.length === 0) {
            document.getElementById("messageText").innerHTML = "The graph has been successfully converted and does not accept any strings";
            quitConversion()
        } else {
            var regularExpression = window.theGraph.transitions[0].label;
            document.getElementById("messageText").innerHTML = "The graph has been successfully converted to the regular expression " + regularExpression;
            quitConversion();
        }
    }
};

//Cancel the current action
var cancelClick = function () {
    "use strict";
    finishConversionAction();
};
//#endregion

//Initialization method to be called at the end of page load
var initialize = function () {
    "use strict";
    window.theGraph = new Graph("graphCanvas");
    window.oldGraph = new Graph("graphCanvas");
    window.paletteController = new PaletteController();
    window.conversionController = new ConversionController();
    document.getElementById("btnAlphabet").addEventListener("click", window.paletteController.alphabetClick);
    document.getElementById("btnAddState").addEventListener("click", window.paletteController.newStateClick);
    document.getElementById("btnAddStart").addEventListener("click", window.paletteController.startStateClick);
    document.getElementById("btnAddFinal").addEventListener("click", window.paletteController.finalStateClick);
    document.getElementById("btnAddTransition").addEventListener("click", window.paletteController.transitionClick);
    document.getElementById("btnDelete").addEventListener("click", window.paletteController.deleteClick);
    document.getElementById("btnUndo").addEventListener("click", window.paletteController.undoClick);
    document.getElementById("btnClear").addEventListener("click", window.paletteController.clearClick);
    document.getElementById("btnRegex").addEventListener("click", startConversion);
    document.getElementById("btnPng").addEventListener("click", toPNG);
    document.getElementById("btnUniqueStart").addEventListener("click", uniqueStartStateButtonClick);
    document.getElementById("btnUniqueFinal").addEventListener("click", uniqueFinalStateButtonClick);
    document.getElementById("btnUniqueStart").addEventListener("click", uniqueStartStateButtonClick);
    document.getElementById("btnCombineTransitions").addEventListener("click", combineTransitions);
    document.getElementById("btnRemoveLoops").addEventListener("click", removeLoops);
    document.getElementById("btnEliminateIntermediate").addEventListener("click", eliminateIntermediateStateButtonClick);
    document.getElementById("btnCancel").addEventListener("click", cancelClick);
    document.getElementById("btnQuit").addEventListener("click", quitConversion);
};

var main = function () {
    "use strict";
    //Sample graph
    var start = window.theGraph.addState("START", "", 50, 50);
    var intermediate1 = window.theGraph.addState("INTERMEDIATE", "1", 300, 250);
    var final = window.theGraph.addState("FINAL", "", 400, 100);
    var intermediate2 = window.theGraph.addState("INTERMEDIATE", "2", 350, 400);
    window.theGraph.addTransition("a+b", start, intermediate1);
    window.theGraph.addTransition("a", intermediate1, final);
    window.theGraph.addTransition(LAMBDA, intermediate1, intermediate2);
    //A loop
    window.theGraph.addTransition("a", intermediate2, intermediate2);
    window.theGraph.draw();
};