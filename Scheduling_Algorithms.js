let processes = [
    { id: "P1", arrivalTime: 0, burstTime: 7, priority: 2 },
    { id: "P2", arrivalTime: 2, burstTime: 4, priority: 1 },
    { id: "P3", arrivalTime: 4, burstTime: 1, priority: 3 },
    { id: "P4", arrivalTime: 5, burstTime: 4, priority: 2 },
    { id: "P5", arrivalTime: 6, burstTime: 3, priority: 1 }
];


function renderProcesses() {
    const container = document.getElementById('processes');
    container.innerHTML = '';
    processes.forEach((process, index) => {
        const row = document.createElement('div');
        row.className = 'process-row';
        row.innerHTML = `
            <div class="input-group">
                <label>Process</label>
                <div class="process-id">${process.id}</div>
            </div>
            <div class="input-group">
                <label>Arrival Time</label>
                <input type="number" value="${process.arrivalTime}" min="0" 
                    onchange="updateProcess(${index}, 'arrivalTime', this.value)">
            </div>
            <div class="input-group">
                <label>Burst Time</label>
                <input type="number" value="${process.burstTime}" min="1"
                    onchange="updateProcess(${index}, 'burstTime', this.value)">
            </div>
            <div class="input-group">
                <label>Priority</label>
                <input type="number" value="${process.priority}" min="1"
                    onchange="updateProcess(${index}, 'priority', this.value)">
            </div>
            <button class="remove-btn" onclick="removeProcess(${index})">Remove</button>
        `;
        container.appendChild(row);
    });
}


function addProcess() {
    const newProcess = {
        id: `P${processes.length + 1}`,
        arrivalTime: 0,
        burstTime: 1,
        priority: 1
    };
    processes.push(newProcess);
    renderProcesses();
}


function updateProcess(index, field, value) {
    processes[index][field] = parseInt(value);
}


function removeProcess(index) {
    processes.splice(index, 1);
    processes.forEach((p, i) => p.id = `P${i + 1}`);
    renderProcesses();
}


function getProcessColor(processId) {
    const colors = [
        "#3b82f6", // blue
        "#22c55e", // green
        "#a855f7", // purple
        "#eab308", // yellow
        "#ef4444", // red
        "#6366f1", // indigo
        "#ec4899"  // pink
    ];
    const index = parseInt(processId.replace("P", "")) % colors.length;
    return colors[index];
}


function toggleQuantumInput() {
    const algorithm = document.getElementById('algorithm').value;
    const quantumContainer = document.getElementById('quantum-container');
    quantumContainer.style.display = (algorithm === 'rr' || algorithm === 'mlq') ? 'block' : 'none';
}


function fcfs(processes) {
    let time = 0;
    let ganttChart = [];
    let waitingTime = 0;
    let turnaroundTime = 0;
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    sortedProcesses.forEach(process => {
        if (time < process.arrivalTime) {
            time = process.arrivalTime;
        }
        const startTime = time;
        const endTime = startTime + process.burstTime;
        time = endTime;
        ganttChart.push({
            id: process.id,
            start: startTime,
            end: endTime
        });
        const wt = startTime - process.arrivalTime;
        const tat = endTime - process.arrivalTime;
        waitingTime += wt;
        turnaroundTime += tat;
    });
    const averageWaitingTime = waitingTime / processes.length;
    const averageTurnaroundTime = turnaroundTime / processes.length;

    return {
        ganttChart,
        averageWaitingTime,
        averageTurnaroundTime
    };
}


function roundRobin(processes, timeQuantum) {
    let time = 0; // Initialize current time
    let ganttChart = []; // Array to store Gantt chart data
    let queue = [...processes.map(p => ({ ...p, remainingTime: p.burstTime }))]; // Copy of processes with remaining time
    let completedProcesses = 0; // Count of completed processes

    while (completedProcesses < processes.length) {
        // Process each process in the queue
        for (let i = 0; i < queue.length; i++) {
            const process = queue[i];
            if (process.remainingTime > 0 && process.arrivalTime <= time) {
                const timeSlice = Math.min(process.remainingTime, timeQuantum);
                
                // Check if we need to add to the Gantt chart or merge with the last process
                if (ganttChart.length > 0 && ganttChart[ganttChart.length - 1].id === process.id) {
                    ganttChart[ganttChart.length - 1].end += timeSlice;
                } else {
                    ganttChart.push({
                        id: process.id,
                        start: time,
                        end: time + timeSlice
                    });
                }

                // Update remaining time and current time
                process.remainingTime -= timeSlice;
                time += timeSlice;

                // If the process is completed
                if (process.remainingTime === 0) {
                    completedProcesses++;
                }
            }
        }

        // If no processes were executed, increment time to the next arriving process
        if (queue.every(p => p.remainingTime === 0 || p.arrivalTime > time)) {
            time = Math.min(...queue.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
        }
    }

    // Calculate waiting and turnaround times
    const completionTimes = processes.map((p, i) => {
        const ganttEntry = ganttChart.filter(block => block.id === p.id);
        return ganttEntry.length > 0 ? ganttEntry[ganttEntry.length - 1].end : 0;
    });

    const waitingTimes = processes.map((p, i) => {
        return completionTimes[i] - p.arrivalTime - p.burstTime; // WT = Completion Time - Arrival Time - Burst Time
    });

    const turnaroundTimes = processes.map((p, i) => {
        return waitingTimes[i] + p.burstTime; // TAT = WT + Burst Time
    });

    const averageWaitingTime = waitingTimes.reduce((sum, wt) => sum + wt, 0) / processes.length;
    const averageTurnaroundTime = turnaroundTimes.reduce((sum, tat) => sum + tat, 0) / processes.length;

    return {
        ganttChart,
        averageWaitingTime,
        averageTurnaroundTime
    };
}


function sjf(processes) {
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const n = processes.length;
    const ganttChart = [];
    const completionTime = {};
    let currentTime = 0;
    let completed = 0;
    while (completed < n) {
        let shortestJob = null;
        let shortestBurst = Number.MAX_VALUE;
        for (const process of sortedProcesses) {
            if (!completionTime[process.id] && process.arrivalTime <= currentTime && process.burstTime < shortestBurst) {
                shortestJob = process;
                shortestBurst = process.burstTime;
            }
        }
        if (shortestJob === null) {
            currentTime++;
            continue;
        }
        ganttChart.push({
            id: shortestJob.id,
            start: currentTime,
            end: currentTime + shortestJob.burstTime
        });
        currentTime += shortestJob.burstTime;
        completionTime[shortestJob.id] = currentTime;
        completed++;
    }
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;
    for (const process of processes) {
        const turnAroundTime = completionTime[process.id] - process.arrivalTime;
        const waitingTime = turnAroundTime - process.burstTime;
        totalWaitingTime += waitingTime;
        totalTurnaroundTime += turnAroundTime;
    }
    return {
        ganttChart,
        averageWaitingTime: totalWaitingTime / n,
        averageTurnaroundTime: totalTurnaroundTime / n
    };
}


function srtf(processes) {
    let time = 0; // Initialize current time
    let ganttChart = []; // Array to store Gantt chart data
    let remainingProcesses = [...processes.map(p => ({ ...p, remainingTime: p.burstTime }))]; // Copy of processes with remaining time
    let completedProcesses = 0; // Count of completed processes
    let completionTimes = new Array(processes.length).fill(0); // To track completion times

    while (completedProcesses < processes.length) {
        // Get the available processes that have arrived
        const availableProcesses = remainingProcesses.filter(p => p.arrivalTime <= time && p.remainingTime > 0);

        if (availableProcesses.length > 0) {
            // Find the process with the shortest remaining time
            const shortestProcess = availableProcesses.reduce((prev, current) => 
                (prev.remainingTime < current.remainingTime) ? prev : current
            );

            // Check if we need to add to the Gantt chart or merge with the last process
            if (ganttChart.length > 0 && ganttChart[ganttChart.length - 1].id === shortestProcess.id) {
                // If the last block is the same as the current process, just update the end time
                ganttChart[ganttChart.length - 1].end += 1; // Increment the end time by 1
            } else {
                // Otherwise, create a new entry in the Gantt chart
                ganttChart.push({
                    id: shortestProcess.id,
                    start: time,
                    end: time + 1 // Increment by 1 time unit
                });
            }

            // Update the remaining time of the selected process
            shortestProcess.remainingTime -= 1; 
            time += 1; // Move time forward by 1 unit
            
            // If the process is completed
            if (shortestProcess.remainingTime === 0) {
                completionTimes[processes.findIndex(p => p.id === shortestProcess.id)] = time; // Track completion time
                completedProcesses++; // Increment the completed processes count
            }
        } else {
            // If no processes are available, move time forward to the next process arrival
            time = Math.min(...remainingProcesses.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
        }
    }

    // Calculate waiting and turnaround times
    const waitingTimes = processes.map((p, i) => {
        return completionTimes[i] - p.arrivalTime - p.burstTime; // WT = Completion Time - Arrival Time - Burst Time
    });

    const turnaroundTimes = processes.map((p, i) => {
        return waitingTimes[i] + p.burstTime; // TAT = WT + Burst Time
    });

    const averageWaitingTime = waitingTimes.reduce((sum, wt) => sum + wt, 0) / processes.length;
    const averageTurnaroundTime = turnaroundTimes.reduce((sum, tat) => sum + tat, 0) / processes.length;

    return {
        ganttChart,
        averageWaitingTime,
        averageTurnaroundTime
    };
}


function prioritySchedulingPreemptive(processes) {
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const n = processes.length;
    const ganttChart = [];
    const completionTime = {};
    let currentTime = 0;
    let remainingProcesses = n;
    let ongoingProcess = null;

    // Add remaining time for each process
    sortedProcesses.forEach(process => process.remainingTime = process.burstTime);

    while (remainingProcesses > 0) {
        let highestPriorityProcess = null;
        let lowestPriorityValue = Number.MAX_VALUE;

        // Select the highest-priority process available at the current time
        for (const process of sortedProcesses) {
            if (process.remainingTime > 0 && process.arrivalTime <= currentTime && process.priority < lowestPriorityValue) {
                highestPriorityProcess = process;
                lowestPriorityValue = process.priority;
            }
        }

        if (highestPriorityProcess === null) {
            // No process is available, increment time
            currentTime++;
            continue;
        }

        if (ongoingProcess !== highestPriorityProcess) {
            // New process selected, add it to the Gantt chart
            ganttChart.push({
                id: highestPriorityProcess.id,
                start: currentTime,
                end: currentTime + 1 // Tentative end for one time unit
            });
            ongoingProcess = highestPriorityProcess;
        } else {
            // Extend the current time slice for the same process
            ganttChart[ganttChart.length - 1].end++;
        }

        // Execute the highest-priority process for one time unit
        highestPriorityProcess.remainingTime--;
        currentTime++;

        // If the process is completed
        if (highestPriorityProcess.remainingTime === 0) {
            completionTime[highestPriorityProcess.id] = currentTime;
            remainingProcesses--;
            ongoingProcess = null;
        }
    }

    // Calculate waiting and turnaround times
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;

    for (const process of processes) {
        const turnAroundTime = completionTime[process.id] - process.arrivalTime;
        const waitingTime = turnAroundTime - process.burstTime;
        totalWaitingTime += waitingTime;
        totalTurnaroundTime += turnAroundTime;
    }

    return {
        ganttChart,
        averageWaitingTime: totalWaitingTime / n,
        averageTurnaroundTime: totalTurnaroundTime / n
    };
}



function hrrn(processes) {
    let time = 0; // Initialize current time
    let ganttChart = []; // Array to store Gantt chart data
    let waitingTime = 0; // Total waiting time
    let turnaroundTime = 0; // Total turnaround time
    let completedProcesses = 0; // Count of completed processes
    const processCount = processes.length; // Total number of processes
    let remainingProcesses = [...processes]; // Copy of processes to track remaining processes

    while (completedProcesses < processCount) {
        // Filter processes that have arrived
        const availableProcesses = remainingProcesses.filter(p => p.arrivalTime <= time);
        
        if (availableProcesses.length > 0) {
            // Calculate response ratios for available processes
            const responseRatios = availableProcesses.map(p => {
                const waitTime = time - p.arrivalTime; // Waiting time
                return {
                    process: p,
                    ratio: (waitTime + p.burstTime) / p.burstTime // Calculate response ratio
                };
            });

            // Select process with the highest response ratio
            const selectedProcess = responseRatios.reduce((prev, current) => 
                (prev.ratio > current.ratio) ? prev : current
            ).process;

            // Calculate start and end times for the selected process
            const startTime = time;
            const endTime = startTime + selectedProcess.burstTime;

            // Update time to the end of the selected process
            time = endTime;

            // Add to Gantt chart
            ganttChart.push({
                id: selectedProcess.id,
                start: startTime,
                end: endTime
            });

            // Calculate waiting and turnaround times
            const wt = startTime - selectedProcess.arrivalTime; // Waiting time
            const tat = endTime - selectedProcess.arrivalTime; // Turnaround time

            waitingTime += wt; // Add to total waiting time
            turnaroundTime += tat; // Add to total turnaround time

            // Mark the process as completed by removing it from remainingProcesses
            remainingProcesses = remainingProcesses.filter(p => p.id !== selectedProcess.id);
            completedProcesses++; // Increment the count of completed processes
        } else {
            // If no processes are available, move time forward to the next process arrival
            time = Math.min(...remainingProcesses.map(p => p.arrivalTime));
        }
    }

    const averageWaitingTime = waitingTime / processes.length; // Average waiting time
    const averageTurnaroundTime = turnaroundTime / processes.length; // Average turnaround time

    return {
        ganttChart,
        averageWaitingTime,
        averageTurnaroundTime
    };
}


function multilevelQueueWithFeedback(processes, baseTimeQuantum) {
    let time = 0; // Initialize current time
    let ganttChart = []; // Array to store Gantt chart data
    let queue = processes.map(p => ({ ...p, remainingTime: p.burstTime, queueLevel: 0 })); // Copy of processes with remaining time
    let completedProcesses = 0; // Count of completed processes
    let maxQueueLevel = 3; // Define the maximum queue level

    // Function to calculate the time quantum for a specific queue level
    const calculateTimeQuantum = (level) => baseTimeQuantum * (2 ** level);

    while (completedProcesses < processes.length) {
        let processExecuted = false;

        for (let i = 0; i < queue.length; i++) {
            const process = queue[i];
            if (process.remainingTime > 0 && process.arrivalTime <= time) {
                const currentQuantum = calculateTimeQuantum(process.queueLevel);
                const timeSlice = Math.min(process.remainingTime, currentQuantum);

                // Check if we need to add to the Gantt chart or merge with the last process
                if (ganttChart.length > 0 && ganttChart[ganttChart.length - 1].id === process.id) {
                    ganttChart[ganttChart.length - 1].end += timeSlice;
                } else {
                    ganttChart.push({
                        id: process.id,
                        start: time,
                        end: time + timeSlice
                    });
                }

                // Update remaining time and current time
                process.remainingTime -= timeSlice;
                time += timeSlice;
                processExecuted = true;

                // If the process is completed
                if (process.remainingTime === 0) {
                    completedProcesses++;
                } else {
                    // Move the process to the next queue level
                    process.queueLevel++;
                    process.queueLevel = Math.min(process.queueLevel, maxQueueLevel - 1); // Ensure queue level does not exceed max
                }
            }
        }

        // If no process was executed in this cycle, advance time to the next arriving process
        if (!processExecuted) {
            time = Math.min(...queue.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
        }
    }

    // Calculate waiting and turnaround times
    const completionTimes = processes.map((p, i) => {
        const ganttEntry = ganttChart.filter(block => block.id === p.id);
        return ganttEntry.length > 0 ? ganttEntry[ganttEntry.length - 1].end : 0;
    });

    const waitingTimes = processes.map((p, i) => {
        return completionTimes[i] - p.arrivalTime - p.burstTime; // WT = Completion Time - Arrival Time - Burst Time
    });

    const turnaroundTimes = processes.map((p, i) => {
        return waitingTimes[i] + p.burstTime; // TAT = WT + Burst Time
    });

    const averageWaitingTime = waitingTimes.reduce((sum, wt) => sum + wt, 0) / processes.length;
    const averageTurnaroundTime = turnaroundTimes.reduce((sum, tat) => sum + tat, 0) / processes.length;

    return {
        ganttChart,
        averageWaitingTime,
        averageTurnaroundTime
    };
}



function simulate() {
    const algorithm = document.getElementById('algorithm').value;
    let result;
    let timeQuantum;
    if (algorithm === 'rr' || algorithm === 'mlq') {
        timeQuantum = parseInt(document.getElementById('timeQuantum').value);
    }
    switch (algorithm) {
        case 'sjf':
            result = sjf(processes);
            break;
        case 'priority':
            result = prioritySchedulingPreemptive(processes);
            break;
        case 'fcfs':
            result = fcfs(processes);
            break;
        case 'rr':
            result = roundRobin(processes, timeQuantum); 
            break;
        case 'srtf':
            result = srtf(processes);
            break;
        case 'hrrn':
            result = hrrn(processes);
            break;
        case 'mlq':
            result = multilevelQueueWithFeedback(processes, timeQuantum);
            break;
        default:
            return;
    }
    document.getElementById('results').classList.remove('hidden');
    const ganttChart = document.getElementById('gantt-chart');
    const timeline = document.getElementById('gantt-timeline');
    ganttChart.innerHTML = '';
    timeline.innerHTML = '';
    result.ganttChart.forEach(block => {
        const width = (block.end - block.start) * 50;
        const processBlock = document.createElement('div');
        processBlock.className = 'process-block';
        processBlock.style.width = `${width}px`;
        processBlock.style.backgroundColor = getProcessColor(block.id);
        processBlock.textContent = block.id;
        ganttChart.appendChild(processBlock);
        const timeBlock = document.createElement('div');
        timeBlock.style.width = `${width}px`;
        timeBlock.textContent = block.start;
        timeline.appendChild(timeBlock);
    });
    const finalTime = document.createElement('div');
    finalTime.textContent = result.ganttChart[result.ganttChart.length - 1].end;
    timeline.appendChild(finalTime);
    document.getElementById('averages').innerHTML = `
        <p><strong>Average Waiting Time:</strong> ${result.averageWaitingTime.toFixed(2)}</p>
        <p><strong>Average Turnaround Time:</strong> ${result.averageTurnaroundTime.toFixed(2)}</p>
    `;
}


document.addEventListener('DOMContentLoaded', () => {
    renderProcesses();
    document.querySelector('.add-btn').addEventListener('click', addProcess);
});