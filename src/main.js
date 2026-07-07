import { ComponentRegistry, WorkspaceStore } from 'mailspring-exports';

import AccountFoldersSidebar from './account-folders-sidebar';

let removedSidebar = null;
let unlisten = null;

function removeDefaultSidebar() {
  const AccountSidebar = ComponentRegistry.findComponentByName('AccountSidebar');
  if (!AccountSidebar) {
    return;
  }
  removedSidebar = AccountSidebar;
  ComponentRegistry.unregister(AccountSidebar);
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
}

export function activate() {
  ComponentRegistry.register(AccountFoldersSidebar, {
    location: WorkspaceStore.Location.RootSidebar,
  });

  removeDefaultSidebar();
  if (!removedSidebar) {
    unlisten = ComponentRegistry.listen(removeDefaultSidebar);
  }
}

export function serialize() {}

export function deactivate() {
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
  if (removedSidebar) {
    ComponentRegistry.register(removedSidebar, {
      location: WorkspaceStore.Location.RootSidebar,
    });
    removedSidebar = null;
  }
  ComponentRegistry.unregister(AccountFoldersSidebar);
}
