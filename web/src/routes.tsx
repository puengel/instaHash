export enum Page {
    TAG,
    HOME
}

// Routes is a collection of all ui routes in the app
const Routes: Map<Page, string> = new Map<Page, string>();
Routes.set(Page.TAG, "/tag/:hash");
Routes.set(Page.HOME, "/");

const PROTOCOL = window.location.protocol
const DOMAIN = window.location.host
const ENDPOINT = PROTOCOL + "//" + DOMAIN



export function GetHashPage(route: Page, hash: string) {
    let page = Routes.get(route)
    if (page === undefined) {
        console.error("page is undefined");
        return "";
    }
    return page.replace(":hash", hash);
}

export { Routes }
export default Page
