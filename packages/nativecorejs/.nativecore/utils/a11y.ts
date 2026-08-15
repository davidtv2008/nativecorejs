let bodyScrollLocks = 0;
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

/**
 * Lock document scrolling while an overlay (modal/drawer) is open.
 * Compensates for the disappearing scrollbar so the page does not shift sideways.
 *
 * Nested locks are reference-counted — call the returned disposer once per lock.
 */
export function lockBodyScroll(): () => void {
    if (typeof document === 'undefined') {
        return () => {};
    }

    if (bodyScrollLocks === 0) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        savedBodyOverflow = document.body.style.overflow;
        savedBodyPaddingRight = document.body.style.paddingRight;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            const currentPad = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
            document.body.style.paddingRight = `${currentPad + scrollbarWidth}px`;
        }
    }
    bodyScrollLocks += 1;

    let released = false;
    return () => {
        if (released) return;
        released = true;
        bodyScrollLocks = Math.max(0, bodyScrollLocks - 1);
        if (bodyScrollLocks === 0) {
            document.body.style.overflow = savedBodyOverflow;
            document.body.style.paddingRight = savedBodyPaddingRight;
        }
    };
}
