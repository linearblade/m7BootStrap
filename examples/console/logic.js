//this module does not represent my finest day, rather the end of the day, at 3am and a great desire to sleep.
//in the event I forget to clean this up later, and you find yourself wondering why o why is this some fugly code; please humbly accept my apologies :)

let consoleBox = null;
let consoleInput = null;
let consoleBody = null;
let consoleSubmit = null;

// Handle command execution
function executeCommand() {
    const cmd = consoleInput.value.trim();
    if (!cmd) return;

    appendToConsole(`> ${cmd}`, 'command');

    let result;
    try {
	result = (1, eval)(cmd); // global eval
    } catch (err) {
	result = err;
    }
    /*  
	try {
	result = Function(`return (${cmd})`)();
	} catch (err) {
	result = err;
	}
    */
    appendToConsole(String(result), 'result');
    consoleInput.value = '';
}

// Append entries to console body
function appendToConsole(text, type) {
    const div = document.createElement('div');
    div.textContent = text;
    div.className = `console-line ${type}`;
    consoleBody.appendChild(div);
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

export function init(){
    console.warn('loading console now');
     consoleBox = document.getElementById('console');
     consoleInput = document.getElementById('console-input');
     consoleBody = document.getElementById('console-body');
     consoleSubmit = document.getElementById('console-submit');

    // Toggle console on tilde (`) key
    document.addEventListener('keydown', (e) => {
	if (e.key === '`') {
	    e.preventDefault();
	    consoleBox.style.display = consoleBox.style.display === 'flex' ? 'none' : 'flex';
	    if (consoleBox.style.display === 'flex') {
		console.warn('trigger keyed');


		consoleInput.focus();
	    }
	}
    });


    // Submit via button
    consoleSubmit.addEventListener('click', executeCommand);

    // Submit via Enter key
    consoleInput.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') {
	    e.preventDefault();
	    executeCommand();
	}
    });
}

export default init;
