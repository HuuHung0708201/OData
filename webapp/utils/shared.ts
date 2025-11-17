export const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

export const noop = () => {}; // No operation function, does nothing