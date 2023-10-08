"use strict";


document.addEventListener("DOMContentLoaded", () => {
    let count = 0;
    let max = 10;
    let total_time = 0;

    let larve = [];

    const logTable = document.getElementById("logTable");
    const userInput = document.getElementById("userInput");
    const question = document.getElementById("question");
    const incorrect = document.getElementById("incorrect");

    const data = document.getElementById("data");

    let startTime = Date.now();


    function displayNumbers() {
        const numbers = generateRandomNumbers();
        numbers.sort((a, b) => a - b);
        // console.log("numbers", numbers);
        question.innerHTML = numbers.join(" ");
    }

    // Load from local storage if available
    // const savedLog = localStorage.getItem('log');
    // if (savedLog) {
    //     logTable.innerHTML = savedLog;
    //     // console.log("Loaded from local storage");
    //     // console.log(savedLog);
    // }

    let savedLarve = localStorage.getItem('larve');

    if (savedLarve) {
        try {
            let str = JSON.parse(savedLarve);
            if (str !== null) {

                data.innerHTML = makeBS5str(str);

                larve = str;
            }
        } catch {
            console.log("failed to parse");
            console.log(savedLarve);
        }
    } else {
        console.log("does not exist");
    }

    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            submitGuess();
        }
    });


    displayNumbers();

    window.submitGuess = () => {
        const guess = userInput.value.trim();


        function processGuess(numbers, elapsedTime) {
            const sum = numbers.reduce((acc, val) => acc + val, 0);

            let int_guess = parseInt(guess);

            let is_correct = int_guess === sum;

            if (is_correct) {
                incorrect.innerHTML = "";
            } else {
                incorrect.innerHTML = sum.toString();
            }

            addLog(count + 1, numbers, int_guess, is_correct, elapsedTime, new Date().toISOString(), sum);

            count++;
        }

        if (guess === "q") {
            const endTime = Date.now();
            const elapsedTime = (endTime - startTime) / 1000;
            total_time += elapsedTime;

            let numbers = question.innerHTML.split(" ");
            numbers = numbers.map((val) => parseInt(val));

            if (guess === "q") {
                // Quit the session
                return;
            }

            if (guess === "s") {
                // Skip the question
                count++;
                return;
            }

            processGuess(numbers, elapsedTime);

        } else if (guess === "s") {
            const endTime = Date.now();
            const elapsedTime = (endTime - startTime) / 1000;
            total_time += elapsedTime;

            let numbers = question.innerHTML.split(" ");
            numbers = numbers.map((val) => parseInt(val));

            if (guess === "q") {
                // Quit the session
                return;
            }

            if (guess === "s") {
                // Skip the question
                count++;
                return;
            }

            processGuess(numbers, elapsedTime);

        } else if (/^[0-9a-z]+$/.test(guess)) {
            const endTime = Date.now();
            const elapsedTime = (endTime - startTime) / 1000;
            total_time += elapsedTime;

            let numbers = question.innerHTML.split(" ");
            numbers = numbers.map((val) => parseInt(val));

            if (guess === "q") {
                // Quit the session
                return;
            }

            if (guess === "s") {
                // Skip the question
                count++;
                return;
            }

            processGuess(numbers, elapsedTime);

        } else {
            alert("Invalid input. Enter only characters 0-9, a-z, or space.");
        }
        displayNumbers();
        userInput.value = "";
        startTime = Date.now();
    };

    window.clearLog = () => {
        localStorage.clear();
        data.innerHTML = "";
    };

    window.newSession = () => {
        count = 0;
        max = 10;
        total_time = 0;
    };

    function generateRandomNumbers() {
        const length = Math.floor(Math.random() * 4) + 3;
        return Array.from({length}, () => Math.floor(Math.random() * 9) + 1);
    }

    function replaceLast(string, search, replace) {

        const index = string.lastIndexOf(search);

        if (index === -1) {
            return string;
        }

        return string.substring(0, index) + replace + string.substring(index + search.length);
    }

    function makeBS5str(larve_str) {
        let start_str = "<div class=\"container border\">";

        let content = "";
        for (let i = 0; i < larve_str.length; i++) {
            content += "<div class=\"row\">";

            for (let key in larve_str[i]) {
                if (key === 'date')
                    continue
                if (key === 'numbers') {
                    let num_str = larve_str[i][key].join(" ");
                    content += `<div class="col px-0">${num_str}</div>`;
                } else {
                    content += `<div class="col px-0">${larve_str[i][key]}</div>`
                }

                if (key === 'is_correct') {
                    let bgcol;
                    if (!larve_str[i][key]) {
                        bgcol = "#F8D7DA";
                    } else {
                        bgcol = "#DAF9EA";
                    }
                    content = replaceLast(content, "col px-0\"", `col " style="background-color: ${bgcol};"`);
                }

            }
            content += "</div>";
        }

        let end_str = "</div>"

        let res;
        res = start_str + content + end_str;


        return res;
    }

    function addLog(nth, numbers, guess, is_correct, elapsedTime, date, sum) {
        let couleur;

        let json;
        json = {
            nth: nth,
            numbers: numbers,
            guess: guess,
            is_correct: is_correct,
            elapsedTime: elapsedTime,
            date: date,
            sum: sum
        }
        larve.push(json);

        localStorage.removeItem('larve');
        let larve_str = JSON.stringify(larve);
        localStorage.setItem('larve', larve_str);


        data.innerHTML = makeBS5str(larve);


        // console.log("is_correct", is_correct);

        couleur = is_correct ? "#DAF9EA" : "#F9E0DA";

        // console.log("couleur", couleur);

        // const newRow = logTable.insertRow(-1);
        // newRow.innerHTML = `<td bgcolor=${couleur}>${nth}</td><td>${numbers.join(" ")}</td><td>${guess}</td><td>${elapsedTime.toFixed(2)}</td><td><span class="hidden">{date}</span></td>`;
        // localStorage.setItem('log', logTable.innerHTML);

        if (parseInt(guess) === sum) {
            console.log("Correct");
        } else {
            console.log("Incorrect");
        }
    }

});
