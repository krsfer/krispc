"use strict";


document.addEventListener("DOMContentLoaded", () => {
    let count = 0;
    let max = 10;
    let total_time = 0;
    const logTable = document.getElementById("logTable");
    const userInput = document.getElementById("userInput");
    const question = document.getElementById("question");

    const incorrect = document.getElementById("incorrect");

    let startTime = Date.now();


    function displayNumbers() {
        const numbers = generateRandomNumbers();
        numbers.sort((a, b) => a - b);
        console.log("numbers", numbers);
        question.innerHTML = numbers.join(" ");
    }

    function getUserInput() {
        return userInput.value.trim();
    }

    // Load from local storage if available
    const savedLog = localStorage.getItem('log');
    if (savedLog) {
        logTable.innerHTML = savedLog;
        console.log("Loaded from local storage");
        console.log(savedLog);
    }

    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            submitGuess();
        }
    });


    displayNumbers();

    window.submitGuess = () => {
        const guess = userInput.value.trim();


        if (guess === "q" || guess === "s" || /^[0-9a-z]+$/.test(guess)) {
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

            const sum = numbers.reduce((acc, val) => acc + val, 0);

            let is_correct = false;
            is_correct = parseInt(guess) === sum;

            if (is_correct) {
                incorrect.innerHTML = "";
            } else {
                incorrect.innerHTML = sum;
            }

            addLog(count + 1, numbers, guess, is_correct, elapsedTime, new Date().toISOString(), sum);

            count++;
        } else {
            alert("Invalid input. Enter only characters 0-9, a-z, or space.");
        }
        displayNumbers();
        userInput.value = "";
        startTime = Date.now();
    };

    window.clearLog = () => {
        localStorage.clear();
        logTable.innerHTML = "<tr><th>Question</th><th>Numbers</th><th>Guess</th><th>Elapsed" +
            " Time(s)</th><th><span class='hidden'>Date</span></th></tr>";
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

    function addLog(question, numbers, guess, is_correct, elapsedTime, date, sum) {
        let couleur = "";

        console.log("is_correct", is_correct);

        couleur = is_correct ? "#DAF9EA" : "#F9E0DA";

        console.log("couleur", couleur);

        const newRow = logTable.insertRow(-1);
        newRow.innerHTML = `<td bgcolor=${couleur}>${question}</td><td>${numbers.join(" ")}</td><td>${guess}</td><td>${elapsedTime.toFixed(2)}</td><td><span class="hidden">{date}</span></td>`;
        localStorage.setItem('log', logTable.innerHTML);

        if (parseInt(guess) === sum) {
            console.log("Correct");
        } else {
            console.log(`The sum is ${sum}`);
        }
    }

});
