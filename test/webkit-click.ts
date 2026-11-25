import { userEvent } from 'vitest/browser';

// WebKit lets audio start for about five seconds after a click
beforeEach(() => userEvent.click(document.body));
