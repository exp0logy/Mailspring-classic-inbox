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
                return Object.assign(Object.assign({}, this._getStateFromStores()), { collapsedNodes: prevState.collapsedNodes, contextMenu: prevState.contextMenu, createDialog: prevState.createDialog, hiddenCategoryIds });
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
            this.setState({
                contextMenu: null,
                createDialog: {
                    x: menu.x,
                    y: menu.y,
                    account: menu.node.account,
                    parentPath: menu.node.category.path,
                    value: "",
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
            this._onCreateCategoryFromAction(dialog.account, dialog.parentPath, dialog.value);
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
            if (!node || !node.isCustom) {
                this._hideContextMenu();
                return;
            }
            event.preventDefault();
            event.stopPropagation();
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
            if (node.isCustom) {
                this._contextMenuNodesById[contextClass] = Object.assign(Object.assign({}, node), { account });
            }
            return {
                id: outlineId,
                name: node.label,
                iconName: this._iconNameForNode(node),
                className: node.isCustom ? contextClass : undefined,
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
        this._standardFolderKeyByPath = account => {
            const keyByPath = {};
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
                    const category = mailspring_exports_1.CategoryStore.getCategoryByRole(account, role);
                    if (category && category.path) {
                        keyByPath[String(category.path).toLowerCase()] = key;
                    }
                });
            });
            return keyByPath;
        };
        this._itemsForAccount = account => {
            const keyByPath = this._standardFolderKeyByPath(account);
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
        this.state = Object.assign(Object.assign({}, this._getStateFromStores()), { collapsedNodes: {}, contextMenu: null, createDialog: null, hiddenCategoryIds: {} });
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
            accounts.map(account => (mailspring_exports_1.React.createElement(mailspring_component_kit_1.OutlineView, { key: account.id, title: this._accountLabel(account), items: this._itemsForAccount(account) }))),
            contextMenu ? (mailspring_exports_1.React.createElement("div", { className: "custom-folder-context-menu", style: { left: contextMenu.x, top: contextMenu.y } },
                mailspring_exports_1.React.createElement("button", { type: "button", className: "menu-item", onClick: this._onContextMenuCreate }, mailspring_exports_1.localized("Create new item")),
                mailspring_exports_1.React.createElement("button", { type: "button", className: "menu-item", onClick: this._onContextMenuDelete }, `${mailspring_exports_1.localized("Delete")} ${contextMenu.node.label}`))) : null,
            createDialog ? (mailspring_exports_1.React.createElement("div", { className: "custom-folder-create-dialog", style: { left: createDialog.x, top: createDialog.y } },
                mailspring_exports_1.React.createElement("input", { autoFocus: true, type: "text", value: createDialog.value, placeholder: mailspring_exports_1.localized("Create new item"), onChange: this._onCreateDialogInputChange, onKeyDown: this._onCreateDialogKeyDown }),
                mailspring_exports_1.React.createElement("div", { className: "actions" },
                    mailspring_exports_1.React.createElement("button", { type: "button", className: "menu-item", onClick: this._onCreateDialogConfirm }, mailspring_exports_1.localized("Create")),
                    mailspring_exports_1.React.createElement("button", { type: "button", className: "menu-item", onClick: this._hideCreateDialog }, mailspring_exports_1.localized("Cancel"))))) : null));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudC1mb2xkZXJzLXNpZGViYXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYWNjb3VudC1mb2xkZXJzLXNpZGViYXIuanN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkRBVzRCO0FBQzVCLHVFQUF1RDtBQUV2RCxNQUFNLE9BQU8sR0FBRztJQUNkO1FBQ0UsR0FBRyxFQUFFLE9BQU87UUFDWixLQUFLLEVBQUUsOEJBQVMsQ0FBQyxPQUFPLENBQUM7UUFDekIsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsdUNBQWtCLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDdkU7SUFDRDtRQUNFLEdBQUcsRUFBRSxNQUFNO1FBQ1gsS0FBSyxFQUFFLDhCQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3hCLGVBQWUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLHVDQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDO0tBQzVGO0lBQ0Q7UUFDRSxHQUFHLEVBQUUsUUFBUTtRQUNiLEtBQUssRUFBRSw4QkFBUyxDQUFDLFFBQVEsQ0FBQztRQUMxQixlQUFlLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyx1Q0FBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN4RTtJQUNEO1FBQ0UsR0FBRyxFQUFFLFNBQVM7UUFDZCxLQUFLLEVBQUUsOEJBQVMsQ0FBQyxTQUFTLENBQUM7UUFDM0IsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQzNCLHVDQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQztLQUMxRTtJQUNEO1FBQ0UsR0FBRyxFQUFFLE1BQU07UUFDWCxLQUFLLEVBQUUsOEJBQVMsQ0FBQyxNQUFNLENBQUM7UUFDeEIsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsdUNB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