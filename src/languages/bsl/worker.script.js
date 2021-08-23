self.onmessage = function (e) {
    console.log("Worker: Receiving message", e.data);
    const textUntilPosition = e.data;
    const data = {
        suggestions: [
            {
                label: "Foobar",
                kind: 25,
                detail: "Details for completion",
                insertText: "Message from webworker"
            }
        ]
    };
    postMessage({ id: e.data.id, data: data, success: true });
}
