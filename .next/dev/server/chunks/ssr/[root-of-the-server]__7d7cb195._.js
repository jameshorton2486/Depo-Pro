module.exports = [
"[externals]/fs [external] (fs, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/[externals]_fs_54ffce70._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/fs [external] (fs, cjs)");
    });
});
}),
"[externals]/path [external] (path, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[externals]/path [external] (path, cjs)");
    });
});
}),
];