import "../../../../packages/ui/src/test/setup"

// jsdom has no scrolling; the router restores scroll on every navigation.
window.scrollTo = () => {}
