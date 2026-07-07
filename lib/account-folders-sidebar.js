"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mailspring_exports_1 = require("mailspring-exports");
const mailspring_component_kit_1 = require("mailspring-component-kit");
const FOLDERS = [
    {
        key: "inbox",
        label: mailspring_exports_1.localized("Inbox"),
        makePerspective: accountId => mailspring_exports_1.MailboxPerspective.forInbox([accountId]),
    },
    {
        key: "sent",
        label: mailspring_exports_1.localized("Sent"),
        makePerspective: accountId => mailspring_exports_1.MailboxPerspective.forStandardCategories([accountId], "sent"),
    },
    {
        key: "drafts",
        label: mailspring_exports_1.localized("Drafts"),
        makePerspective: accountId => mailspring_exports_1.MailboxPerspective.forDrafts([accountId]),
    },
    {
        key: "archive",
        label: mailspring_exports_1.localized("Archive"),
        makePerspective: accountId => mailspring_exports_1.MailboxPerspective.forStandardCategories([accountId], "archive", "all"),
    },
    {
        key: "spam",
        label: mailspring_exports_1.localized("Spam"),
        makePerspective: accountId => mailspring_exports_1.MailboxPerspective.forStandardCategories([accountId], "spam"),
    },
    {
        key: "trash",
        label: mailspring_exports_1.localized("Trash"),
        makePerspective: accountId => mailspring_exports_1.MailboxPerspective.forStandardCategories([accountId], "trash"),
    },
];
class AccountFoldersSidebar extends mailspring_exports_1.React.Component {
    constructor(props) {
        super(props);
        this._setSidebarRef = element => {
            this._sidebarRef = element;
        };
        this._onStoreChange = () => {
            this.setState(prevState => {
                const hiddenCategoryIds = Object.assign({}, prevState.hiddenCategoryIds);
                const accounts = mailspring_exports_1.AccountStore.accounts() || [];
                const activeCategoryIds = new Set();
                accounts.forEach(account => {
                    const categories = mailspring_exports_1.CategoryStore.userCategories(account) || [];
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
                return Object.assign(Object.assign({}, this._getStateFromStores()), { collapsedNodes: prevState.collapsedNodes, collapsedAccounts: prevState.collapsedAccounts, contextMenu: prevState.contextMenu, createDialog: prevState.createDialog, hiddenCategoryIds });
            });
        };
        this._getStateFromStores = () => {
            return {
                accounts: mailspring_exports_1.AccountStore.accounts(),
                focusedPerspective: mailspring_exports_1.FocusedPerspectiveStore.current(),
            };
        };
        this._accountLabel = account => account.label || account.emailAddress || account.id;
        this._standardFoldersForAccount = account => {
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
        this._pathPartsForCategory = category => {
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
        this._customFoldersForAccount = account => {
            const categories = mailspring_exports_1.CategoryStore.userCategories(account) || [];
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
                    perspective: mailspring_exports_1.MailboxPerspective.forCategory(category),
                };
            });
        };
        this._customFolderTreeForAccount = account => {
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
        this._onAccountDragStart = (event, account) => {
            event.dataTransfer.setData("mailspring-account-reorder", account.id);
            event.dataTransfer.effectAllowed = "move";
        };
        this._onAccountDragOver = (event, account) => {
            if (!event.dataTransfer.types.includes("mailspring-account-reorder")) {
                return;
            }
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const before = event.clientY < rect.top + rect.height / 2;
            if (this.state.dragOverAccountId !== account.id || this.state.dragOverBefore !== before) {
                this.setState({ dragOverAccountId: account.id, dragOverBefore: before });
            }
        };
        this._onAccountDragLeave = event => {
            if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
                return;
            }
            this._onAccountDragEnd();
        };
        this._onAccountDragEnd = () => {
            if (this.state.dragOverAccountId) {
                this.setState({ dragOverAccountId: null, dragOverBefore: null });
            }
        };
        this._onAccountDrop = (event, account, index) => {
            const sourceId = event.dataTransfer.getData("mailspring-account-reorder");
            const before = this.state.dragOverBefore;
            this.setState({ dragOverAccountId: null, dragOverBefore: null });
            if (!sourceId) {
                return;
            }
            event.preventDefault();
            const accounts = this.state.accounts || [];
            const sourceIndex = accounts.findIndex(a => a.id === sourceId);
            if (sourceIndex === -1) {
                return;
            }
            const insertAt = index + (before ? 0 : 1);
            const newIndex = insertAt > sourceIndex ? insertAt - 1 : insertAt;
            if (newIndex === sourceIndex) {
                return;
            }
            mailspring_exports_1.Actions.reorderAccount(sourceId, newIndex);
        };
        this._isAccountCollapsed = accountId => !!this.state.collapsedAccounts[accountId];
        this._toggleAccountCollapsed = accountId => {
            this.setState(prevState => ({
                collapsedAccounts: Object.assign(Object.assign({}, prevState.collapsedAccounts), { [accountId]: !prevState.collapsedAccounts[accountId] }),
            }));
        };
        this._nodeStateKey = (accountId, pathKey) => `${accountId}:${pathKey}`;
        this._isNodeCollapsed = (accountId, pathKey) => {
            const key = this._nodeStateKey(accountId, pathKey);
            if (this.state.collapsedNodes[key] === undefined) {
                return true;
            }
            return !!this.state.collapsedNodes[key];
        };
        this._toggleNodeCollapsed = (accountId, pathKey) => {
            const key = this._nodeStateKey(accountId, pathKey);
            this.setState(prevState => ({
                collapsedNodes: Object.assign(Object.assign({}, prevState.collapsedNodes), { [key]: prevState.collapsedNodes[key] === undefined
                        ? false
                        : !prevState.collapsedNodes[key] }),
            }));
        };
        this._shouldAcceptThreadDrop = (targetPerspective, event) => {
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
            const accountsType = event.dataTransfer.types.find(type => type.startsWith("mailspring-accounts="));
            const accountIds = (accountsType || "").replace("mailspring-accounts=", "").split(",");
            return targetPerspective.canReceiveThreadsFromAccountIds(accountIds);
        };
        this._onDropThreads = (targetPerspective, event) => {
            if (!targetPerspective || !event || !event.dataTransfer) {
                return;
            }
            const jsonString = event.dataTransfer.getData("mailspring-threads-data");
            let jsonData = null;
            try {
                jsonData = JSON.parse(jsonString);
            }
            catch (err) {
                return;
            }
            if (!jsonData || !jsonData.threadIds) {
                return;
            }
            targetPerspective.receiveThreadIds(jsonData.threadIds);
        };
        this._onCreateCategory = account => {
            return (displayName, parentPath = null) => {
                const rawName = (displayName || "").trim();
                const name = parentPath ? `${parentPath}/${rawName}` : rawName;
                if (!name) {
                    return;
                }
                mailspring_exports_1.Actions.queueTask(mailspring_exports_1.SyncbackCategoryTask.forCreating({
                    name,
                    accountId: account.id,
                }));
            };
        };
        this._onCreateCategoryFromAction = (account, parentPath = null, displayName = "") => {
            const name = (displayName || "").trim();
            if (!name) {
                return;
            }
            this._onCreateCategory(account)(name, parentPath);
        };
        this._onDeleteCategory = node => {
            if (!node || !node.category || !node.isCustom) {
                return;
            }
            const confirmed = window.confirm(mailspring_exports_1.localized("Are you sure?"));
            if (!confirmed) {
                return;
            }
            const categoryId = node.category.id;
            if (categoryId) {
                this.setState(prevState => ({
                    hiddenCategoryIds: Object.assign(Object.assign({}, prevState.hiddenCategoryIds), { [categoryId]: true }),
                }));
            }
            mailspring_exports_1.Actions.queueTask(new mailspring_exports_1.DestroyCategoryTask({
                path: node.category.path,
                accountId: node.category.accountId,
            }));
        };
        this._iconNameForNode = node => {
            if (node.iconName) {
                return node.iconName;
            }
            if (node.perspective && node.perspective.iconName) {
                return node.perspective.iconName;
            }
            return "folder.png";
        };
        this._hideContextMenu = () => {
            if (this.state.contextMenu) {
                this.setState({ contextMenu: null });
            }
        };
        this._hideCreateDialog = () => {
            if (this.state.createDialog) {
                this.setState({ createDialog: null });
            }
        };
        this._onGlobalMouseDown = event => {
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
        this._onGlobalKeyDown = event => {
            if (event && event.key === "Escape") {
                this._hideContextMenu();
                this._hideCreateDialog();
            }
        };
        this._onContextMenuCreate = () => {
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
        this._onContextMenuRename = () => {
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
        this._onContextMenuDelete = () => {
            const menu = this.state.contextMenu;
            if (!menu || !menu.node) {
                return;
            }
            this._hideContextMenu();
            this._onDeleteCategory(menu.node);
        };
        this._onCreateDialogInputChange = event => {
            const value = event && event.target ? event.target.value : "";
            this.setState(prevState => ({
                createDialog: prevState.createDialog
                    ? Object.assign(Object.assign({}, prevState.createDialog), { value }) : null,
            }));
        };
        this._onCreateDialogConfirm = () => {
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
                        mailspring_exports_1.Actions.queueTask(mailspring_exports_1.SyncbackCategoryTask.forRenaming({
                            path: dialog.category.path,
                            accountId: dialog.account.id,
                            newName,
                        }));
                    }
                }
            }
            else {
                this._onCreateCategoryFromAction(dialog.account, dialog.parentPath, dialog.value);
            }
            this._hideCreateDialog();
        };
        this._onCreateDialogKeyDown = event => {
            if (!event) {
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                this._onCreateDialogConfirm();
            }
        };
        this._extractContextClass = target => {
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
        this._onNativeContextMenuCapture = event => {
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
        this._asOutlineItem = (node, account) => {
            const accountId = account.id;
            const outlineId = `${accountId}-${node.key}`;
            const contextClass = `ctx-folder-${outlineId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
            const hasChildren = node.children && node.children.length > 0;
            const count = node.perspective ? this._countForPerspective(node.perspective) : 0;
            const selected = node.perspective ? this._isSelected(node.perspective) : false;
            const childItems = (node.children || []).map(child => this._asOutlineItem(child, account));
            if (node.category || node.path) {
                this._contextMenuNodesById[contextClass] = Object.assign(Object.assign({}, node), { account });
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
        this._standardCategoriesByKey = account => {
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
                    const category = mailspring_exports_1.CategoryStore.getCategoryByRole(account, role);
                    if (category && category.path) {
                        categoryByKey[key] = category;
                    }
                });
            });
            return categoryByKey;
        };
        this._itemsForAccount = account => {
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
                    childrenByFolderKey[folderKey] = (childrenByFolderKey[folderKey] || []).concat(node.children);
                }
                else {
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
        this._onOpenFolder = perspective => {
            mailspring_exports_1.Actions.focusMailboxPerspective(perspective);
        };
        this._isSelected = perspective => {
            const current = this.state.focusedPerspective;
            return current && current.isEqual && current.isEqual(perspective);
        };
        this._countForPerspective = perspective => {
            if (!perspective || typeof perspective.unreadCount !== "function") {
                return 0;
            }
            const count = perspective.unreadCount();
            if (!count || count < 0) {
                return 0;
            }
            return count;
        };
        this.state = Object.assign(Object.assign({}, this._getStateFromStores()), { collapsedNodes: {}, collapsedAccounts: {}, contextMenu: null, createDialog: null, hiddenCategoryIds: {} });
        this._contextMenuNodesById = {};
        this._sidebarRef = null;
    }
    componentDidMount() {
        this.unsubscribeAccount = mailspring_exports_1.AccountStore.listen(this._onStoreChange);
        this.unsubscribeCategories = mailspring_exports_1.CategoryStore.listen(this._onStoreChange);
        this.unsubscribePerspective = mailspring_exports_1.FocusedPerspectiveStore.listen(this._onStoreChange);
        this.unsubscribeCounts = mailspring_exports_1.ThreadCountsStore.listen(this._onStoreChange);
        document.addEventListener("contextmenu", this._onNativeContextMenuCapture, true);
        document.addEventListener("mousedown", this._onGlobalMouseDown, true);
        document.addEventListener("keydown", this._onGlobalKeyDown, true);
    }
    componentWillUnmount() {
        if (this.unsubscribeAccount)
            this.unsubscribeAccount();
        if (this.unsubscribeCategories)
            this.unsubscribeCategories();
        if (this.unsubscribePerspective)
            this.unsubscribePerspective();
        if (this.unsubscribeCounts)
            this.unsubscribeCounts();
        document.removeEventListener("contextmenu", this._onNativeContextMenuCapture, true);
        document.removeEventListener("mousedown", this._onGlobalMouseDown, true);
        document.removeEventListener("keydown", this._onGlobalKeyDown, true);
    }
    render() {
        const { accounts, contextMenu, createDialog } = this.state;
        this._contextMenuNodesById = {};
        if (!accounts || accounts.length === 0) {
            return null;
        }
        return (mailspring_exports_1.React.createElement("div", { className: "account-folders-sidebar", ref: this._setSidebarRef },
            mailspring_exports_1.React.createElement(mailspring_component_kit_1.ScrollRegion, { className: "account-folders-scroll" }, accounts.map((account, index) => {
                const collapsed = this._isAccountCollapsed(account.id);
                const dragOver = this.state.dragOverAccountId === account.id;
                const headerContextClass = `ctx-folder-account-${account.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
                this._contextMenuNodesById[headerContextClass] = {
                    isAccountHeader: true,
                    account,
                    label: this._accountLabel(account),
                };
                const dragOverClass = dragOver
                    ? this.state.dragOverBefore
                        ? " drag-over-top"
                        : " drag-over-bottom"
                    : "";
                return (mailspring_exports_1.React.createElement("div", { key: account.id, className: `account-section${dragOverClass}`, onDragOver: event => this._onAccountDragOver(event, account), onDragLeave: this._onAccountDragLeave, onDrop: event => this._onAccountDrop(event, account, index) },
                    mailspring_exports_1.React.createElement("div", { className: `account-section-header ${headerContextClass}`, draggable: true, onClick: () => this._toggleAccountCollapsed(account.id), onDragStart: event => this._onAccountDragStart(event, account), onDragEnd: this._onAccountDragEnd },
                        mailspring_exports_1.React.createElement(mailspring_component_kit_1.DisclosureTriangle, { visible: true, collapsed: collapsed }),
                        mailspring_exports_1.React.createElement("div", { className: "account-section-title" }, this._accountLabel(account))),
                    !collapsed && mailspring_exports_1.React.createElement(mailspring_component_kit_1.OutlineView, { title: "", items: this._itemsForAccount(account) })));
            })),
            contextMenu ? (mailspring_exports_1.React.createElement("div", { className: "custom-folder-context-menu", style: { left: contextMenu.x, top: contextMenu.y } },
                mailspring_exports_1.React.createElement("button", { type: "button", className: "menu-item", onClick: this._onContextMenuCreate }, contextMenu.node.isAccountHeader
                    ? mailspring_exports_1.localized("New Folder")
                    : mailspring_exports_1.localized("New Subfolder")),
                contextMenu.node.isCustom && contextMenu.node.category ? (mailspring_exports_1.React.createElement("button", { type: "button", className: "menu-item", onClick: this._onContextMenuRename }, mailspring_exports_1.localized("Rename"))) : null,
                contextMenu.node.isCustom && contextMenu.node.category ? (mailspring_exports_1.React.createElement("button", { type: "button", className: "menu-item", onClick: this._onContextMenuDelete }, `${mailspring_exports_1.localized("Delete")} ${contextMenu.node.label}`)) : null)) : null,
            createDialog ? (mailspring_exports_1.React.createElement("div", { className: "custom-folder-create-dialog", style: { left: createDialog.x, top: createDialog.y } },
                mailspring_exports_1.React.createElement("input", { autoFocus: true, type: "text", value: createDialog.value, placeholder: createDialog.mode === "rename"
                        ? mailspring_exports_1.localized("Rename")
                        : mailspring_exports_1.localized("Create new item"), onChange: this._onCreateDialogInputChange, onKeyDown: this._onCreateDialogKeyDown }),
                mailspring_exports_1.React.createElement("div", { className: "actions" },
                    mailspring_exports_1.React.createElement("button", { type: "button", className: "btn btn-emphasis", onClick: this._onCreateDialogConfirm }, createDialog.mode === "rename" ? mailspring_exports_1.localized("Rename") : mailspring_exports_1.localized("Create")),
                    mailspring_exports_1.React.createElement("button", { type: "button", className: "btn", onClick: this._hideCreateDialog }, mailspring_exports_1.localized("Cancel"))))) : null));
    }
}
exports.default = AccountFoldersSidebar;
AccountFoldersSidebar.displayName = "AccountFoldersSidebar";
AccountFoldersSidebar.containerRequired = false;
AccountFoldersSidebar.containerStyles = {
    order: 0,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudC1mb2xkZXJzLXNpZGViYXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYWNjb3VudC1mb2xkZXJzLXNpZGViYXIuanN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkRBVzRCO0FBQzVCLHVFQUF5RjtBQUV6RixNQUFNLE9BQU8sR0FBRztJQUNkO1FBQ0UsR0FBRyxFQUFFLE9BQU87UUFDWixLQUFLLEVBQUUsOEJBQVMsQ0FBQyxPQUFPLENBQUM7UUFDekIsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsdUNBQWtCLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDdkU7SUFDRDtRQUNFLEdBQUcsRUFBRSxNQUFNO1FBQ1gsS0FBSyxFQUFFLDhCQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3hCLGVBQWUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLHVDQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDO0tBQzVGO0lBQ0Q7UUFDRSxHQUFHLEVBQUUsUUFBUTtRQUNiLEtBQUssRUFBRSw4QkFBUyxDQUFDLFFBQVEsQ0FBQztRQUMxQixlQUFlLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyx1Q0FBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN4RTtJQUNEO1FBQ0UsR0FBRyxFQUFFLFNBQVM7UUFDZCxLQUFLLEVBQUUsOEJBQVMsQ0FBQyxTQUFTLENBQUM7UUFDM0IsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQzNCLHVDQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQztLQUMxRTtJQUNEO1FBQ0UsR0FBRyxFQUFFLE1BQU07UUFDWCxLQUFLLEVBQUUsOEJBQVMsQ0FBQyxNQUFNLENBQUM7UUFDeEIsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsdUNB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