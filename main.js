import {EditorView, basicSetup} from "codemirror";
import {keymap} from "@codemirror/view";
import {EditorState, Compartment, Text as CMText} from "@codemirror/state"
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
const fileTypeMap = {
  javascript: 'text/javascript',
  html: 'text/html',
  css: 'text/css',
  xml: 'application/xml',
  json: 'application/json',
  markdown: 'text/markdown'
}

let currentFile = {
  name: 'untitled.html',
  file: undefined,
  type: fileTypeMap.html,
  handle: undefined
}

let liveEditEnabled = false;

let currentDir = {
  handle: undefined,
  structure: {}
}

let avalableLanguages = {
  javascript: javascript,
  html: html,
  css: css,
  xml: xml,
  json: json
}

//get elements

//buttons
const file = {
  menu: document.getElementById('file-menu-container'),
  save: document.getElementById('file-save'),
  download: document.getElementById('file-download'),
  open: document.getElementById('file-file-input'),
  openButton: document.getElementById('file-open'),
  openDir: document.getElementById('file-open-dir'),
  rename: document.getElementById('file-rename'),
  setType: document.getElementById('file-set-type'),
  setTypeSelect: document.getElementById('file-set-type-select'),
  new: document.getElementById('file-new')
}

const edit = {
  menu: document.getElementById('edit-menu-container'),
  copyFile: document.getElementById('edit-copy-file'),
  paste: document.getElementById('edit-paste')
}

const view = {
  menu: document.getElementById('view-menu-container'),
  tabSetSize: document.getElementById('view-tab-set-size')
}

const settingsSaveButton = document.getElementById('settings-save-button');

//display elements
const fileNameDisplay = document.getElementById('display-filename');


//menu button event handlers
file.save.addEventListener('pointerdown', async function() {
  currentFile.file = convertEditorToBlob(editView, currentFile.name, currentFile.type);
  if(liveEditEnabled) {
    let stream = await currentFile.handle.createWritable();
    stream.seek(0);
    stream.write(currentFile.file);
    stream.close();
  }
  URL.revokeObjectURL(currentFile.file);
  file.download.href = URL.createObjectURL(currentFile.file);
  file.download.download = currentFile.name;
  
});

file.rename.addEventListener('pointerdown', () => {
  currentFile.name = window.prompt('Rename file to:', currentFile.name);
  updateFileNameDisplay();
});

file.openButton.addEventListener('pointerdown', async function() {
  if(liveEditEnabled) {
    let fileHandle = await window.showOpenFilePicker({multiple: false});
    if(window.confirm('Are you sure?')) {
      currentFile.handle = fileHandle[0];
      currentFile.name = currentFile.handle.name;
      updateFileNameDisplay();
      currentFile.file = await currentFile.handle.getFile();
      currentFile.type = currentFile.file.type;
      let fileText = await currentFile.file.text();
      editView.dispatch({
        changes: {from: 0, to: editView.state.doc.length, insert: fileText}
      });
    }
  }
});

file.open.addEventListener('change', async function(event) {
  console.log('file input');
  let confirmed = window.confirm('Are you sure?');
  if(confirmed) {
    let fileText = await file.open.files[0].text();
    currentFile.file = file.open.files[0];
    currentFile.name = file.open.value.slice(12);
    currentFile.type = file.open.files[0].type;
    updateFileNameDisplay();
    editView.dispatch({
      changes: {from: 0, to: editView.state.doc.length, insert: fileText}
    });
  }
});

file.new.addEventListener('pointerdown', () => {
  currentFile.name = "untitled.html";
  currentFile.file = undefined;
  currentFile.type = fileTypeMap.html;
  editView.dispatch({
    changes: {from: 0, to: editView.state.doc.length, insert: ''}
  });
});

file.setTypeSelect.addEventListener('input', (event) => {
  console.log(event.target.value);
  editView.dispatch({
    effects: language.reconfigure(avalableLanguages[event.target.value]())
  });
});

/*file.openDir.addEventListener('pointerdown', async function() {
  currentDir.handle = await window.showDirectoryPicker({mode: "readwrite"});
  console.log(currentDir);
  
  currentDir.structure = await getDirStructure(currentDir.handle);
  console.log(currentDir.structure);
}); Finish later*/

edit.copyFile.addEventListener('pointerdown', () => {
  navigator.clipboard.write(editorView.state.doc.text.join('\n'));
});

view.tabSetSize.addEventListener('pointerdown', () => {
  reconfigureTabSize(Number(window.prompt('Set tab spacing')));
});

settingsSaveButton.addEventListener('pointerdown', () => {
  updateSettings();
});

//utility functions
function updateFileNameDisplay() {
  fileNameDisplay.innerText = currentFile.name;
}
updateFileNameDisplay(); //Call immedately to show the default

async function getDirStructure(dirHandle) {
  let obj = {};
  for await (const [key, value] of dirHandle.entries()) {
    console.log(obj);
    console.log(key);
    obj[key] = value;
  }
  return obj;
}

function getEditorContents(editorView) {
  return editorView.state.doc.text.join('\n')
}

function convertEditorToBlob(editorView, name, type) {
  let contents = getEditorContents(editorView);
  return new File([contents], name, {type: type, endings: 'transparent'});
}

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
let editView = new EditorView({
  state,
  parent: document.getElementById('editor-container')
});

function reconfigureTabSize(size) {
  editView.dispatch({
    effects: tabSize.reconfigure(EditorState.tabSize.of(size)),
    reconfigured: true
  });
}

function updateSettings() {
  file.menu.style.display = (settingsElementMap.toolbar.file.showFileMenu.checked)? 'block' : 'none';
  edit.menu.style.display = (settingsElementMap.toolbar.edit.showEditMenu.checked)? 'block' : 'none';
  view.menu.style.display = (settingsElementMap.toolbar.view.showViewMenu.checked)? 'block' : 'none';
  
  liveEditEnabled = settingsElementMap.toolbar.file.openLiveFile.checked;
  file.open.disabled = settingsElementMap.toolbar.file.openLiveFile.checked;
  
  reconfigureTabSize(settingsElementMap.editor.tabSetSize.valueAsNumber);
}