"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.serialize = exports.activate = void 0;
const mailspring_exports_1 = require("mailspring-exports");
const account_folders_sidebar_1 = __importDefault(require("./account-folders-sidebar"));
let removedSidebar = null;
let unlisten = null;
function removeDefaultSidebar() {
    const AccountSidebar = mailspring_exports_1.ComponentRegistry.findComponentByName('AccountSidebar');
    if (!AccountSidebar) {
        return;
    }
    removedSidebar = AccountSidebar;
    mailspring_exports_1.ComponentRegistry.unregister(AccountSidebar);
    if (unlisten) {
        unlisten();
        unlisten = null;
    }
}
function activate() {
    mailspring_exports_1.ComponentRegistry.register(account_folders_sidebar_1.default, {
        location: mailspring_exports_1.WorkspaceStore.Location.RootSidebar,
    });
    removeDefaultSidebar();
    if (!removedSidebar) {
        unlisten = mailspring_exports_1.ComponentRegistry.listen(removeDefaultSidebar);
    }
}
exports.activate = activate;
function serialize() { }
exports.serialize = serialize;
function deactivate() {
    if (unlisten) {
        unlisten();
        unlisten = null;
    }
    if (removedSidebar) {
        mailspring_exports_1.ComponentRegistry.register(removedSidebar, {
            location: mailspring_exports_1.WorkspaceStore.Location.RootSidebar,
        });
        removedSidebar = null;
    }
    mailspring_exports_1.ComponentRegistry.unregister(account_folders_sidebar_1.default);
}
exports.deactivate = deactivate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDJEQUF1RTtBQUV2RSx3RkFBOEQ7QUFFOUQsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDO0FBQzFCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQztBQUVwQixTQUFTLG9CQUFvQjtJQUMzQixNQUFNLGNBQWMsR0FBRyxzQ0FBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQy9FLElBQUksQ0FBQyxjQUFjLEVBQUU7UUFDbkIsT0FBTztLQUNSO0lBQ0QsY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUNoQyxzQ0FBaUIsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDN0MsSUFBSSxRQUFRLEVBQUU7UUFDWixRQUFRLEVBQUUsQ0FBQztRQUNYLFFBQVEsR0FBRyxJQUFJLENBQUM7S0FDakI7QUFDSCxDQUFDO0FBRUQsU0FBZ0IsUUFBUTtJQUN0QixzQ0FBaUIsQ0FBQyxRQUFRLENBQUMsaUNBQXFCLEVBQUU7UUFDaEQsUUFBUSxFQUFFLG1DQUFjLENBQUMsUUFBUSxDQUFDLFdBQVc7S0FDOUMsQ0FBQyxDQUFDO0lBRUgsb0JBQW9CLEVBQUUsQ0FBQztJQUN2QixJQUFJLENBQUMsY0FBYyxFQUFFO1FBQ25CLFFBQVEsR0FBRyxzQ0FBaUIsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztLQUMzRDtBQUNILENBQUM7QUFURCw0QkFTQztBQUVELFNBQWdCLFNBQVMsS0FBSSxDQUFDO0FBQTlCLDhCQUE4QjtBQUU5QixTQUFnQixVQUFVO0lBQ3hCLElBQUksUUFBUSxFQUFFO1FBQ1osUUFBUSxFQUFFLENBQUM7UUFDWCxRQUFRLEdBQUcsSUFBSSxDQUFDO0tBQ2pCO0lBQ0QsSUFBSSxjQUFjLEVBQUU7UUFDbEIsc0NBQWlCLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRTtZQUN6QyxRQUFRLEVBQUUsbUNBQWMsQ0FBQyxRQUFRLENBQUMsV0FBVztTQUM5QyxDQUFDLENBQUM7UUFDSCxjQUFjLEdBQUcsSUFBSSxDQUFDO0tBQ3ZCO0lBQ0Qsc0NBQWlCLENBQUMsVUFBVSxDQUFDLGlDQUFxQixDQUFDLENBQUM7QUFDdEQsQ0FBQztBQVpELGdDQVlDIn0=