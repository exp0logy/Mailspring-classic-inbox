import {
  React,
  AccountStore,
  CategoryStore,
  FocusedPerspectiveStore,
  ThreadCountsStore,
  Actions,
  MailboxPerspective,
  SyncbackCategoryTask,
  DestroyCategoryTask,
  localized,
} from "mailspring-exports";
import { OutlineView, DisclosureTriangle, ScrollRegion } from "mailspring-component-kit";

const FOLDERS = [
  {
    key: "inbox",
    label: localized("Inbox"),
    makePerspective: accountId => MailboxPerspective.forInbox([accountId]),
  },
  {
    key: "sent",
    label: localized("Sent"),
    makePerspective: accountId => MailboxPerspective.forStandardCategories([accountId], "sent"),
  },
  {
    key: "drafts",
    label: localized("Drafts"),
    makePerspective: accountId => MailboxPerspective.forDrafts([accountId]),
  },
  {
    key: "archive",
    label: localized("Archive"),
    makePerspective: accountId =>
      MailboxPerspective.forStandardCategories([accountId], "archive", "all"),
  },
  {
    key: "spam",
    label: localized("Spam"),
    makePerspective: accountId => MailboxPerspective.forStandardCategories([accountId], "spam"),
  },
  {
    key: "trash",
    label: localized("Trash"),
    makePerspective: accountId => MailboxPerspective.forStandardCategories([accountId], "trash"),
  },
];

export default class AccountFoldersSidebar extends React.Component {
  static displayName = "AccountFoldersSidebar";

  static containerRequired = false;

  static containerStyles = {
    order: 0,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  };

  constructor(props) {
    super(props);
    this.state = {
      ...this._getStateFromStores(),
      collapsedNodes: {},
      collapsedAccounts: {},
      contextMenu: null,
      createDialog: null,
      hiddenCategoryIds: {},
    };
    this._contextMenuNodesById = {};
    this._sidebarRef = null;
  }

  componentDidMount() {
    this.unsubscribeAccount = AccountStore.listen(this._onStoreChange);
    this.unsubscribeCategories = CategoryStore.listen(this._onStoreChange);
    this.unsubscribePerspective = FocusedPerspectiveStore.listen(this._onStoreChange);
    this.unsubscribeCounts = ThreadCountsStore.listen(this._onStoreChange);
    document.addEventListener("contextmenu", this._onNativeContextMenuCapture, true);
    document.addEventListener("mousedown", this._onGlobalMouseDown, true);
    document.addEventListener("keydown", this._onGlobalKeyDown, true);
  }

  componentWillUnmount() {
    if (this.unsubscribeAccount) this.unsubscribeAccount();
    if (this.unsubscribeCategories) this.unsubscribeCategories();
    if (this.unsubscribePerspective) this.unsubscribePerspective();
    if (this.unsubscribeCounts) this.unsubscribeCounts();
    document.removeEventListener("contextmenu", this._onNativeContextMenuCapture, true);
    document.removeEventListener("mousedown", this._onGlobalMouseDown, true);
    document.removeEventListener("keydown", this._onGlobalKeyDown, true);
  }

  _setSidebarRef = element => {
    this._sidebarRef = element;
  };

  _onStoreChange = () => {
    this.setState(prevState => {
      const hiddenCategoryIds = { ...prevState.hiddenCategoryIds };
      const accounts = AccountStore.accounts() || [];
      const activeCategoryIds = new Set();

      accounts.forEach(account => {
        const categories = CategoryStore.userCategories(account) || [];
        categories.forEach(category => {
          if (category && category.id) {
            activeCategoryIds.add(category.id);
          }
        });
      });

      Object.keys(hiddenCategoryIds).forEach(categoryId => {
        if (!activeCategoryIds.has(categoryId)) {
          delete hiddenCategoryIds[categoryId];
        }
      });

      return {
        ...this._getStateFromStores(),
        collapsedNodes: prevState.collapsedNodes,
        collapsedAccounts: prevState.collapsedAccounts,
        contextMenu: prevState.contextMenu,
        createDialog: prevState.createDialog,
        hiddenCategoryIds,
      };
    });
  };

  _getStateFromStores = () => {
    return {
      accounts: AccountStore.accounts(),
      focusedPerspective: FocusedPerspectiveStore.current(),
    };
  };

  _accountLabel = account => account.label || account.emailAddress || account.id;

  _standardFoldersForAccount = account => {
    return FOLDERS.map(folder => {
      const perspective = folder.makePerspective(account.id);
      return {
        key: `std-${account.id}-${folder.key}`,
        folderKey: folder.key,
        label: folder.label,
        perspective,
        iconName: (perspective && perspective.iconName) || "folder.png",
      };
    });
  };

  _pathPartsForCategory = category => {
    const fallbackName = category.displayName || category.path || category.name || "Folder";
    const rawPath = String(category.path || category.displayName || category.name || fallbackName);
    const slashParts = rawPath.replace(/\\/g, "/").split("/").filter(Boolean);

    if (slashParts.length > 1) {
      return slashParts;
    }

    const dottedParts = String(fallbackName).split(".").filter(Boolean);
    if (dottedParts.length > 1) {
      return dottedParts;
    }

    return [fallbackName];
  };

  _customFoldersForAccount = account => {
    const categories = CategoryStore.userCategories(account) || [];
    return categories
      .filter(category => category && !this.state.hiddenCategoryIds[category.id])
      .map(category => {
      const parts = this._pathPartsForCategory(category);
      const baseName = parts[parts.length - 1] || category.displayName || "Folder";
      return {
        id: category.id,
        key: `custom-${category.id}`,
        label: baseName,
        category,
        isCustom: true,
        iconName: "folder.png",
        parts,
        perspective: MailboxPerspective.forCategory(category),
      };
      });
  };

  _customFolderTreeForAccount = account => {
    const folders = this._customFoldersForAccount(account).sort((a, b) => {
      const aPath = a.parts.join("/").toLowerCase();
      const bPath = b.parts.join("/").toLowerCase();
      return aPath.localeCompare(bPath);
    });

    const root = [];
    const nodeByPath = {};

    folders.forEach(folder => {
      let siblings = root;
      const currentPath = [];

      folder.parts.forEach((part, index) => {
        currentPath.push(part);
        const pathKey = currentPath.join("/").toLowerCase();
        let node = nodeByPath[pathKey];

        if (!node) {
          node = {
            key: `group-${pathKey}`,
            pathKey,
            path: currentPath.join("/"),
            label: part,
            iconName: "folder.png",
            perspective: null,
            children: [],
          };
          nodeByPath[pathKey] = node;
          siblings.push(node);
        }

        if (index === folder.parts.length - 1) {
          node.key = folder.key;
          node.pathKey = pathKey;
          node.path = folder.parts.join("/");
          node.label = folder.label;
          node.category = folder.category;
          node.isCustom = true;
          node.iconName = folder.iconName;
          node.perspective = folder.perspective;
        }

        siblings = node.children;
      });
    });

    return root;
  };

  _onAccountDragStart = (event, account) => {
    event.dataTransfer.setData("mailspring-account-reorder", account.id);
    event.dataTransfer.effectAllowed = "move";
  };

  _onAccountDragOver = (event, account) => {
    if (!event.dataTransfer.types.includes("mailspring-account-reorder")) {
      return;
    }
    event.preventDefault();
    if (this.state.dragOverAccountId !== account.id) {
      this.setState({ dragOverAccountId: account.id });
    }
  };

  _onAccountDragEnd = () => {
    if (this.state.dragOverAccountId) {
      this.setState({ dragOverAccountId: null });
    }
  };

  _onAccountDrop = (event, account, index) => {
    const sourceId = event.dataTransfer.getData("mailspring-account-reorder");
    this.setState({ dragOverAccountId: null });
    if (!sourceId || sourceId === account.id) {
      return;
    }
    event.preventDefault();
    Actions.reorderAccount(sourceId, index);
  };

  _isAccountCollapsed = accountId => !!this.state.collapsedAccounts[accountId];

  _toggleAccountCollapsed = accountId => {
    this.setState(prevState => ({
      collapsedAccounts: {
        ...prevState.collapsedAccounts,
        [accountId]: !prevState.collapsedAccounts[accountId],
      },
    }));
  };

  _nodeStateKey = (accountId, pathKey) => `${accountId}:${pathKey}`;

  _isNodeCollapsed = (accountId, pathKey) => {
    const key = this._nodeStateKey(accountId, pathKey);
    if (this.state.collapsedNodes[key] === undefined) {
      return true;
    }
    return !!this.state.collapsedNodes[key];
  };

  _toggleNodeCollapsed = (accountId, pathKey) => {
    const key = this._nodeStateKey(accountId, pathKey);
    this.setState(prevState => ({
      collapsedNodes: {
        ...prevState.collapsedNodes,
        [key]:
          prevState.collapsedNodes[key] === undefined
            ? false
            : !prevState.collapsedNodes[key],
      },
    }));
  };

  _shouldAcceptThreadDrop = (targetPerspective, event) => {
    if (!targetPerspective || !event || !event.dataTransfer) {
      return false;
    }
    if (!event.dataTransfer.types.includes("mailspring-threads-data")) {
      return false;
    }

    const current = this.state.focusedPerspective;
    if (current && targetPerspective.isEqual && targetPerspective.isEqual(current)) {
      return false;
    }

    const accountsType = event.dataTransfer.types.find(type =>
      type.startsWith("mailspring-accounts=")
    );
    const accountIds = (accountsType || "").replace("mailspring-accounts=", "").split(",");
    return targetPerspective.canReceiveThreadsFromAccountIds(accountIds);
  };

  _onDropThreads = (targetPerspective, event) => {
    if (!targetPerspective || !event || !event.dataTransfer) {
      return;
    }
    const jsonString = event.dataTransfer.getData("mailspring-threads-data");
    let jsonData = null;
    try {
      jsonData = JSON.parse(jsonString);
    } catch (err) {
      return;
    }
    if (!jsonData || !jsonData.threadIds) {
      return;
    }
    targetPerspective.receiveThreadIds(jsonData.threadIds);
  };

  _onCreateCategory = account => {
    return (displayName, parentPath = null) => {
      const rawName = (displayName || "").trim();
      const name = parentPath ? `${parentPath}/${rawName}` : rawName;
      if (!name) {
        return;
      }
      Actions.queueTask(
        SyncbackCategoryTask.forCreating({
          name,
          accountId: account.id,
        })
      );
    };
  };

  _onCreateCategoryFromAction = (account, parentPath = null, displayName = "") => {
    const name = (displayName || "").trim();
    if (!name) {
      return;
    }
    this._onCreateCategory(account)(name, parentPath);
  };

  _onDeleteCategory = node => {
    if (!node || !node.category || !node.isCustom) {
      return;
    }

    const confirmed = window.confirm(localized("Are you sure?"));
    if (!confirmed) {
      return;
    }

    const categoryId = node.category.id;
    if (categoryId) {
      this.setState(prevState => ({
        hiddenCategoryIds: {
          ...prevState.hiddenCategoryIds,
          [categoryId]: true,
        },
      }));
    }

    Actions.queueTask(
      new DestroyCategoryTask({
        path: node.category.path,
        accountId: node.category.accountId,
      })
    );
  };

  _iconNameForNode = node => {
    if (node.iconName) {
      return node.iconName;
    }
    if (node.perspective && node.perspective.iconName) {
      return node.perspective.iconName;
    }
    return "folder.png";
  };

  _hideContextMenu = () => {
    if (this.state.contextMenu) {
      this.setState({ contextMenu: null });
    }
  };

  _hideCreateDialog = () => {
    if (this.state.createDialog) {
      this.setState({ createDialog: null });
    }
  };

  _onGlobalMouseDown = event => {
    if (this.state.contextMenu) {
      const menu = this._sidebarRef && this._sidebarRef.querySelector
        ? this._sidebarRef.querySelector(".custom-folder-context-menu")
        : null;
      if (!menu || !menu.contains(event.target)) {
        this._hideContextMenu();
      }
    }

    if (this.state.createDialog) {
      const dialog = this._sidebarRef && this._sidebarRef.querySelector
        ? this._sidebarRef.querySelector(".custom-folder-create-dialog")
        : null;
      if (!dialog || !dialog.contains(event.target)) {
        this._hideCreateDialog();
      }
    }
  };

  _onGlobalKeyDown = event => {
    if (event && event.key === "Escape") {
      this._hideContextMenu();
      this._hideCreateDialog();
    }
  };

  _onContextMenuCreate = () => {
    const menu = this.state.contextMenu;
    if (!menu || !menu.node) {
      return;
    }
    const node = menu.node;
    const parentPath = node.isAccountHeader
      ? null
      : (node.category && node.category.path) || node.path || null;
    this.setState({
      contextMenu: null,
      createDialog: {
        mode: "create",
        x: menu.x,
        y: menu.y,
        account: node.account,
        parentPath,
        value: "",
      },
    });
  };

  _onContextMenuRename = () => {
    const menu = this.state.contextMenu;
    if (!menu || !menu.node || !menu.node.category) {
      return;
    }
    const node = menu.node;
    const parts = this._pathPartsForCategory(node.category);
    this.setState({
      contextMenu: null,
      createDialog: {
        mode: "rename",
        x: menu.x,
        y: menu.y,
        account: node.account,
        category: node.category,
        value: parts[parts.length - 1] || node.label,
      },
    });
  };

  _onContextMenuDelete = () => {
    const menu = this.state.contextMenu;
    if (!menu || !menu.node) {
      return;
    }
    this._hideContextMenu();
    this._onDeleteCategory(menu.node);
  };

  _onCreateDialogInputChange = event => {
    const value = event && event.target ? event.target.value : "";
    this.setState(prevState => ({
      createDialog: prevState.createDialog
        ? {
            ...prevState.createDialog,
            value,
          }
        : null,
    }));
  };

  _onCreateDialogConfirm = () => {
    const dialog = this.state.createDialog;
    if (!dialog) {
      return;
    }
    if (dialog.mode === "rename") {
      const value = (dialog.value || "").trim();
      if (value) {
        const rawPath = String(dialog.category.path);
        const slashIdx = rawPath.lastIndexOf("/");
        const newName = slashIdx > 0 ? `${rawPath.slice(0, slashIdx)}/${value}` : value;
        if (newName !== rawPath) {
          Actions.queueTask(
            SyncbackCategoryTask.forRenaming({
              path: dialog.category.path,
              accountId: dialog.account.id,
              newName,
            })
          );
        }
      }
    } else {
      this._onCreateCategoryFromAction(dialog.account, dialog.parentPath, dialog.value);
    }
    this._hideCreateDialog();
  };

  _onCreateDialogKeyDown = event => {
    if (!event) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      this._onCreateDialogConfirm();
    }
  };

  _extractContextClass = target => {
    let node = target;
    while (node) {
      if (node.classList && node.classList.length > 0) {
        const match = Array.from(node.classList).find(name => name.indexOf("ctx-folder-") === 0);
        if (match) {
          return match;
        }
      }
      node = node.parentElement;
    }
    return null;
  };

  _onNativeContextMenuCapture = event => {
    if (!this._sidebarRef || !event || !event.target) {
      return;
    }

    const clickedInsideSidebar = this._sidebarRef.contains(event.target);
    if (!clickedInsideSidebar) {
      return;
    }

    const contextClass = this._extractContextClass(event.target);
    const node = contextClass ? this._contextMenuNodesById[contextClass] : null;

    if (!node) {
      this._hideContextMenu();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (node.perspective) {
      this._onOpenFolder(node.perspective);
    }

    this.setState({
      contextMenu: {
        x: event.clientX,
        y: event.clientY,
        node,
      },
    });
  };

  _asOutlineItem = (node, account) => {
    const accountId = account.id;
    const outlineId = `${accountId}-${node.key}`;
    const contextClass = `ctx-folder-${outlineId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    const hasChildren = node.children && node.children.length > 0;
    const count = node.perspective ? this._countForPerspective(node.perspective) : 0;
    const selected = node.perspective ? this._isSelected(node.perspective) : false;
    const childItems = (node.children || []).map(child => this._asOutlineItem(child, account));

    if (node.category || node.path) {
      this._contextMenuNodesById[contextClass] = {
        ...node,
        account,
      };
    }

    return {
      id: outlineId,
      name: node.label,
      iconName: this._iconNameForNode(node),
      className: node.category || node.path ? contextClass : undefined,
      count,
      selected,
      collapsed: hasChildren ? this._isNodeCollapsed(accountId, node.pathKey || node.key) : false,
      children: childItems,
      onDrop: node.perspective ? (item, event) => this._onDropThreads(node.perspective, event) : null,
      shouldAcceptDrop: node.perspective
        ? (item, event) => this._shouldAcceptThreadDrop(node.perspective, event)
        : null,
      onCollapseToggled: hasChildren
        ? () => this._toggleNodeCollapsed(accountId, node.pathKey || node.key)
        : undefined,
      onSelect: node.perspective ? () => this._onOpenFolder(node.perspective) : undefined,
    };
  };

  _standardCategoriesByKey = account => {
    const categoryByKey = {};
    const rolesByKey = {
      inbox: ["inbox"],
      sent: ["sent"],
      drafts: ["drafts"],
      archive: ["archive", "all"],
      spam: ["spam"],
      trash: ["trash"],
    };
    Object.keys(rolesByKey).forEach(key => {
      rolesByKey[key].forEach(role => {
        if (categoryByKey[key]) {
          return;
        }
        const category = CategoryStore.getCategoryByRole(account, role);
        if (category && category.path) {
          categoryByKey[key] = category;
        }
      });
    });
    return categoryByKey;
  };

  _itemsForAccount = account => {
    const categoryByKey = this._standardCategoriesByKey(account);
    const keyByPath = {};
    Object.keys(categoryByKey).forEach(key => {
      keyByPath[String(categoryByKey[key].path).toLowerCase()] = key;
    });
    const childrenByFolderKey = {};
    const customRoots = [];

    this._customFolderTreeForAccount(account).forEach(node => {
      const folderKey = keyByPath[node.pathKey];
      if (folderKey && !node.isCustom && node.children.length > 0) {
        childrenByFolderKey[folderKey] = (childrenByFolderKey[folderKey] || []).concat(
          node.children
        );
      } else {
        customRoots.push(node);
      }
    });

    const standardItems = this._standardFoldersForAccount(account).map(folder => {
      const node = {
        key: folder.key,
        pathKey: folder.folderKey,
        label: folder.label,
        iconName: folder.iconName,
        perspective: folder.perspective,
        category: categoryByKey[folder.folderKey],
        children: childrenByFolderKey[folder.folderKey] || [],
      };
      return this._asOutlineItem(node, account);
    });

    const customTreeItems = customRoots.map(node => this._asOutlineItem(node, account));

    return standardItems.concat(customTreeItems);
  };

  _onOpenFolder = perspective => {
    Actions.focusMailboxPerspective(perspective);
  };

  _isSelected = perspective => {
    const current = this.state.focusedPerspective;
    return current && current.isEqual && current.isEqual(perspective);
  };

  _countForPerspective = perspective => {
    if (!perspective || typeof perspective.unreadCount !== "function") {
      return 0;
    }

    const count = perspective.unreadCount();
    if (!count || count < 0) {
      return 0;
    }
    return count;
  };

  render() {
    const { accounts, contextMenu, createDialog } = this.state;
    this._contextMenuNodesById = {};

    if (!accounts || accounts.length === 0) {
      return null;
    }

    return (
      <div className="account-folders-sidebar" ref={this._setSidebarRef}>
        <ScrollRegion className="account-folders-scroll">
        {accounts.map((account, index) => {
          const collapsed = this._isAccountCollapsed(account.id);
          const dragOver = this.state.dragOverAccountId === account.id;
          const headerContextClass = `ctx-folder-account-${account.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
          this._contextMenuNodesById[headerContextClass] = {
            isAccountHeader: true,
            account,
            label: this._accountLabel(account),
          };
          return (
            <div key={account.id} className="account-section">
              <div
                className={`account-section-header ${headerContextClass}${dragOver ? " drag-over" : ""}`}
                draggable
                onClick={() => this._toggleAccountCollapsed(account.id)}
                onDragStart={event => this._onAccountDragStart(event, account)}
                onDragOver={event => this._onAccountDragOver(event, account)}
                onDragLeave={this._onAccountDragEnd}
                onDragEnd={this._onAccountDragEnd}
                onDrop={event => this._onAccountDrop(event, account, index)}
              >
                <DisclosureTriangle visible collapsed={collapsed} />
                <div className="account-section-title">{this._accountLabel(account)}</div>
              </div>
              {!collapsed && <OutlineView title="" items={this._itemsForAccount(account)} />}
            </div>
          );
        })}
        </ScrollRegion>
        {contextMenu ? (
          <div
            className="custom-folder-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button type="button" className="menu-item" onClick={this._onContextMenuCreate}>
              {contextMenu.node.isAccountHeader
                ? localized("New Folder")
                : localized("New Subfolder")}
            </button>
            {contextMenu.node.isCustom && contextMenu.node.category ? (
              <button type="button" className="menu-item" onClick={this._onContextMenuRename}>
                {localized("Rename")}
              </button>
            ) : null}
            {contextMenu.node.isCustom && contextMenu.node.category ? (
              <button type="button" className="menu-item" onClick={this._onContextMenuDelete}>
                {`${localized("Delete")} ${contextMenu.node.label}`}
              </button>
            ) : null}
          </div>
        ) : null}
        {createDialog ? (
          <div
            className="custom-folder-create-dialog"
            style={{ left: createDialog.x, top: createDialog.y }}
          >
            <input
              autoFocus
              type="text"
              value={createDialog.value}
              placeholder={
                createDialog.mode === "rename"
                  ? localized("Rename")
                  : localized("Create new item")
              }
              onChange={this._onCreateDialogInputChange}
              onKeyDown={this._onCreateDialogKeyDown}
            />
            <div className="actions">
              <button type="button" className="btn btn-emphasis" onClick={this._onCreateDialogConfirm}>
                {createDialog.mode === "rename" ? localized("Rename") : localized("Create")}
              </button>
              <button type="button" className="btn" onClick={this._hideCreateDialog}>
                {localized("Cancel")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}
