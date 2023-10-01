/*$(".change").on("click", function () {
    if ($("body").hasClass("dark")) {
        $("body").removeClass("dark");
        $(".change").text("OFF");
    } else {
        $("body").addClass("dark");
        $(".change").text("ON");
    }
});*/

document.getElementById("mode").addEventListener("click", myFunction);

function myFunction() {
    console.log("ok1")
    if (document.body.classList.contains("dark")) {
        document.body.classList.remove("dark");
        document.querySelector(".change").textContent = "OFF";
    } else {
        document.body.classList.add("dark");
        document.querySelector(".change").textContent = "ON";
    }
}
