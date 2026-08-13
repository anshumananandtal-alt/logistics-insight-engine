declare module 'papaparse' {
  const Papa: {
    parse: (input: string, config?: Record<string, unknown>) => { data: unknown[] };
  };
  export default Papa;
}
