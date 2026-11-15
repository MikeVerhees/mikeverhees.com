// Pure parallax math for the background glow, kept separate from the DOM
// wiring in Base.astro so it can be unit tested without a DOM.

/** The glow follows the page at half speed: a 50% parallax. */
export const GLOW_PARALLAX = 0.5;

/** Downward shift of the glow for a given scroll offset, in px. */
export function glowShift(scrollY: number): string {
	return `${scrollY * GLOW_PARALLAX}px`;
}
