document.addEventListener("DOMContentLoaded", () => {

    fetch("./header.html")
        .then(response => {
            if (!response.ok) throw new Error("Header load failed: " + response.status);
            return response.text();
        })
        .then(data => {
            const el = document.getElementById("header");
            if (el) el.innerHTML = data;
        })
        .catch(err => console.error(err));

    fetch("./footer.html")
        .then(response => {
            if (!response.ok) throw new Error("Footer load failed: " + response.status);
            return response.text();
        })
        .then(data => {
            const el = document.getElementById("footer");
            if (el) el.innerHTML = data;
        })
        .catch(err => console.error(err));

});