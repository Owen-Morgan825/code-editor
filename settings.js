const settingsElementMap = {
  toolbar: {
    file: {
      showFileMenu: document.getElementById('settings-toolbar-file-show-menu')
    },
    edit: {
      showEditMenu: document.getElementById('settings-toolbar-edit-show-menu')
    },
    view: {
      showViewMenu: document.getElementById('settings-toolbar-view-show-menu')
    }
  },
  editor: {
    tabSetSize: document.getElementById('settings-editor-tab-set-size')
  }
}

export { settingsElementMap };