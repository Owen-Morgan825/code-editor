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

let currentFile = 0;

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

const tabbarListEl = document.getElementById('tabbar-container');
let tabbarList = Array.from(tabbarListEl.children);

console.log(tabbarListEl, tabbarList);

const editorContainer = document.getElementById('editor-container');

let tabs = [];

function defaultNewFile() {
  //This is up here because it only returns a single value- really, it's an object value rather than a utility function
  return {
    name: 'untitled' + tabs.length + '.html',
    file: new File([], "untitled.html", {type: fileTypeMap.html}),
    type: fileTypeMap.html,
    handle: undefined
  };
};


const settingsSaveButton = document.getElementById('settings-save-button');

//display elements
const fileNameDisplay = document.getElementById('display-filename');
const fileSaveStatus = {
  el: document.getElementById('display-file-save-status'),
  status: "saved"
};

//menu button event handlers
file.save.addEventListener('pointerdown', () => saveFile());

file.rename.addEventListener('pointerdown', () => {
  let newName = window.prompt('Rename file to:', tabs[currentFile].name);
  tabs[currentFile].name = newName;
  updateFileNameDisplay();
});

file.openButton.addEventListener('pointerdown', async function() {
  if(liveEditEnabled) {
    let fileHandle = await window.showOpenFilePicker({multiple: false});
    if(window.confirm('Are you sure you want to open this file?')) {
      let newFile = {};
      newFile.handle = fileHandle[0];
      newFile.name = newFile.handle.name;
      newFile.file = await newFile.handle.getFile();
      newFile.type = newFile.file.type;
      let fileText = await newFile.file.text();
      updateEditorDisplay(fileText);
      addTab(newFile);
    }
  }
});

file.open.addEventListener('change', async function(event) {
  let confirmed = window.confirm('Are you sure?');
  if(confirmed) {
    let fileText = await file.open.files[0].text();
    let newFile = {};
    newFile.file = file.open.files[0];
    newFile.name = file.open.value.slice(12);
    newFile.type = file.open.files[0].type;
    updateEditorDisplay(fileText);
    addTab(newFile);
  }
});

file.new.addEventListener('pointerdown', () => {
  let newFile = defaultNewFile();
  editView.dispatch({
    changes: {from: 0, to: editView.state.doc.length, insert: ''}
  });
  addTab(newFile);
});

file.setTypeSelect.addEventListener('input', (event) => {
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
  navigator.clipboard.writeText(getEditorContents(editView));
});

edit.paste.addEventListener('pointerdown', () => {
  navigator.clipboard.readText().then((text) => {
    console.log('clipboard: ', text);
    //TODO: implement this
  });
});

view.tabSetSize.addEventListener('pointerdown', () => {
  reconfigureTabSize(Number(window.prompt('Set tab spacing')));
});

settingsSaveButton.addEventListener('pointerdown', () => {
  updateSettings();
});

//other event handlers
editorContainer.addEventListener('keydown', (e) => {
  fileSaveStatus.el.innerText = " *";
  fileSaveStatus.status = "unsaved";
});

window.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === "s") {
    e.preventDefault();
    saveFile();
  }
});

//utility functions

async function saveFile() {
  tabs[currentFile].file = convertEditorToBlob(editView, tabs[currentFile].name, tabs[currentFile].type);
  if(liveEditEnabled) {
    if(tabs[currentFile].handle !== undefined) {
      let stream = await tabs[currentFile].handle.createWritable();
      stream.seek(0);
      stream.write(tabs[currentFile].file);
      stream.close();
    } else {
      throw new Error("Saving new files when set to open live is not supported yet (devs: implement feature)");
    }
  }
  URL.revokeObjectURL(tabs[currentFile].file);
  file.download.href = URL.createObjectURL(tabs[currentFile].file);
  file.download.download = tabs[currentFile].name;
  fileSaveStatus.el.innerText = "";
  fileSaveStatus.status = "saved";
}

function updateEditorDisplay(fileText) {
  updateFileNameDisplay();
  editView.dispatch({
    changes: {from: 0, to: editView.state.doc.length, insert: fileText}
  });
}

function updateTabBarList() {
  tabbarList = Array.from(tabbarListEl.children);
}

function addTab(fileObject) {
  console.log(tabbarListEl);
  const tab = createTabBarItem(fileObject);
  tabbarListEl.append(tab);
  updateTabBarList();
  tabs.push(fileObject);
  currentFile = tabs.length - 1;
  updateFileNameDisplay();
  console.log(tabs);
}

addTab(defaultNewFile());

function createTabBarItem(fileObject) {
  const li = document.createElement('li');
  li.value = tabbarList.length;
  const button = document.createElement('button');
  button.addEventListener('pointerdown', async function () {
    console.log(tabs);
    currentFile = tabbarList.indexOf(this.parentElement);
    console.log(tabs);
    const fileObj = await tabs[currentFile].file.text();
    updateEditorDisplay(fileObj);
  });
  button.innerText = fileObject.name;
  button.className = "tabbar-button";
  const closeButton = document.createElement('button');
  closeButton.addEventListener('pointerdown', async function () {
    if(tabs.length > 1) {
      console.log("tab closed");
      currentFile = (currentFile === 0)? 0 : currentFile - 1;
    
      tabs.splice(tabbarList.indexOf(this.parentElement), 1);
      this.parentElement.remove();
    
      updateTabBarList();
      const fileText = await tabs[currentFile].file.text();
      updateEditorDisplay(fileText);
    } else {
      console.error("Can't delete tab with only one tab");
    }
  });
  closeButton.innerText = "X";
  closeButton.className = "deny-button close-tab";

  li.append(button, closeButton);

  return li;
}

function findFileTab(fileObject) {
  const index = tabs.indexOf(fileObject);
  return tabbarList[index];
}

function updateFileNameDisplay() {
  let newFileName = tabs[currentFile].name
  fileNameDisplay.innerText = newFileName;
  tabbarList[currentFile].children[0].innerText = newFileName;
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
  if(!(editorView.state.doc.text === undefined)) {
    return editorView.state.doc.text.join('\n');
  } else {
    //console.log(editorView.state.doc);
    return editorView.state.doc.children.join('\n');
  }
  //console.log(editorView.state.doc);
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
  parent: editorContainer
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