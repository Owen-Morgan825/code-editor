import {EditorView, basicSetup} from "codemirror";
import {keymap} from "@codemirror/view";
import {EditorState, Compartment} from "@codemirror/state"
import {indentWithTab} from "@codemirror/commands"

import {javascript} from "@codemirror/lang-javascript";
import {html} from "@codemirror/lang-html";
import {css} from "@codemirror/lang-css";
import {xml} from "@codemirror/lang-xml";
import {json} from "@codemirror/lang-json";
import {markdown} from "@codemirror/lang-markdown";
import {languages} from "@codemirror/language-data";

import {settingsElementMap} from "./settings.js";

//important global variables
let currentFileName = 'untitled.html';
let avalableLanguages = {
  javascript: javascript,
  html: html,
  css: css,
  xml: xml,
  json: json
}

//get elements

//buttons
const fileMenu = document.getElementById('file-menu-container');
const fileSave = document.getElementById('file-save');
const fileSaveAs = document.getElementById('file-save-as');
const fileRename = document.getElementById('file-rename');
const fileSetType = document.getElementById('file-set-type');
const fileSetTypeSelect = document.getElementById('file-set-type-select');

const viewTabSetSize = document.getElementById('view-tab-set-size');

const settingsSaveButton = document.getElementById('settings-save-button');

//display elements
const fileNameDisplay = document.getElementById('display-filename');


//menu button event handlers
fileRename.addEventListener('pointerdown', () => {
  currentFileName = window.prompt('Rename file to:', currentFileName);
  updateFileNameDisplay();
});
fileSetTypeSelect.addEventListener('change', (event) => {
  console.log(event.target.value);
  view.dispatch({
    effects: language.reconfigure(avalableLanguages[event.target.value]())
  });
});
viewTabSetSize.addEventListener('pointerdown', () => {reconfigureTabSize(Number(window.prompt('Set tab spacing')))});

settingsSaveButton.addEventListener('pointerdown', () => {
  updateSettings();
});

//utility functions
function updateFileNameDisplay() {
  fileNameDisplay.innerText = currentFileName;
  console.log(currentFileName);
}
updateFileNameDisplay(); //Call immedately to show the default

//text editor code
let language = new Compartment();
let tabSize = new Compartment();

let state = EditorState.create({
  extensions: [
    basicSetup,
    language.of(html()),
    tabSize.of(EditorState.tabSize.of(2)),
    keymap.of([indentWithTab])
  ],
});
let view = new EditorView({
  state,
  parent: document.getElementById('main')
});

function reconfigureTabSize(size) {
  view.dispatch({
    effects: tabSize.reconfigure(EditorState.tabSize.of(size)),
    reconfigured: true
  });
}

function updateSettings() {
  fileMenu.style.display = (settingsElementMap.toolbar.file.showFileMenu.checked)? 'block' : 'none';
  reconfigureTabSize(settingsElementMap.editor.tabSetSize.valueAsNumber);
}