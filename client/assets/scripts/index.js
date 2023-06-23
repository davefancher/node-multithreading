let logScrollInterval;

const createCpuChart =
    chartIndex => {
        const chartContainer = document.createElement("div");
        const chartCanvas = document.createElement("canvas");
        chartContainer.appendChild(chartCanvas);

        return new Chart(
            chartCanvas,
            {
                type: "line",
                data: {
                    labels: new Array(60).fill("00"),
                    datasets: [
                        {
                            label: `CPU ${chartIndex + 1}`,
                            data: new Array(60).fill(0)
                        }
                    ]
                },
                options: {
                    animation: false,
                    elements: {
                        line: {
                            fill: "stack",
                            borderWidth: 1,
                            tension: 0.25,
                            borderColor: "#002b36",
                            backgroundColor: "#002b36"
                        },
                        point: {
                            pointStyle: false
                        }
                    },
                    layout: {
                        autoPadding: false,
                        padding: 0
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            color: "#002b36",
                            text: `CPU ${chartIndex + 1}`
                        }
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: 100,
                            ticks: {
                                color: "#002b36"
                            }
                        },
                        x: {
                            display: false
                        }
                    }
                }
            });
    };

const updateCpuCharts =
    (chartContainer, time) => {
        const cpuUsageCharts = [];

        return data => {
            const second = time.getSeconds().toString().padStart(2, "0");

            if (chartContainer.children.length === 0) {
                data.forEach((cpu, ix) => {
                    const chart = createCpuChart(ix);

                    cpuUsageCharts.push(chart);
                    chartContainer.append(chart.canvas.parentElement);
                });

                setTimeout(Reveal.layout, 0);
            }

            data
                .forEach((cpu, ix) => {
                    const usageChartData = cpuUsageCharts[ix]?.data;

                    if (!usageChartData) return;

                    void usageChartData.labels.shift();
                    usageChartData.labels.push(second);

                    const dataset = usageChartData.datasets[0];

                    void dataset.data.shift();
                    dataset.data.push(Math.round(cpu.percentage * 100));

                    cpuUsageCharts[ix].update();
                });
        };
    };

const writeLogMessage =
    logList =>
        logJson => {
            const log = JSON.parse(logJson);

            const newLogItem = document.createElement("li");
            newLogItem.classList.add("log_item", `log_item_${log.level}`);
            newLogItem.appendChild(
                document.createTextNode(`${log.timestamp} ${log.label} ${log.level.padEnd(8, "\xa0")} ${log.message}`)
            );

            logList.appendChild(newLogItem);
        };

const showGeneratedFiles =
    (fileList, resizeResult) => {
        resizeResult
            .files
            .map(fileUrl => {
                const urlParts = new URL(fileUrl).pathname.split("/");
                const fileName = decodeURI(urlParts[urlParts.length - 1]);

                const scale = /\d{2,3}\%/.exec(fileName)[0];

                const link = document.createElement("A");
                link.href = fileUrl;
                link.text = scale;
                link.target = "_blank";

                const listItem = document.createElement("li");
                listItem.appendChild(link);

                fileList.appendChild(listItem);
            });
    };

// Adapted from https://stackoverflow.com/a/45411081
const scrollElementToLastChild =
    logList => {
        if (!logList.lastChild?.getBoundingClientRect) return;

        const parentRect = logList.getBoundingClientRect();
        const childRect = logList.lastChild.getBoundingClientRect();

        if (!childRect) return;

        const isViewable = (childRect.top >= parentRect.top) && (childRect.bottom <= parentRect.bottom);

        if(!isViewable) {
            const scrollTop = childRect.top - parentRect.top;
            const scrollBottom = childRect.bottom - parentRect.bottom;

            logList.scrollTop +=
                Math.abs(scrollTop) < Math.abs(scrollBottom)
                    ? scrollTop
                    : scrollBottom;
        }
    };

const stopMonitors =
    socket =>
        void socket
            .off("disconnect")
            .off("log")
            .off("cpu")
            .off("resize-complete");

const DEMO = {
    SERIAL: "serial",
    PARALLEL: "parallel",
    CHILD_PROCESS: "childProcess",
    WORKER_THREAD: "workerThread",
    THREAD_POOL: "threadPool"
};

const runDemo =
    strategy =>
        socket => {
                const __fileSelector = document.getElementById(`fileSelector_${strategy}`);
                const __cpuUsage = document.getElementById(`cpuUsage_${strategy}`);
                const __logList = document.getElementById(`logList_${strategy}`);
                const __fileList = document.getElementById(`fileList_${strategy}`);

                if (__fileSelector.files.length < 1) {
                    alert("You need to select a file first");
                    return;
                }

                __cpuUsage.replaceChildren([]);
                __logList.replaceChildren([]);
                __fileList.replaceChildren([]);

                socket
                    .on(
                        "disconnect",
                        reason => {
                            const writeToLog = writeLogMessage(__logList);

                            const disconnectedMessage = JSON.stringify({
                                timestamp: new Date().toISOString(),
                                label: "[-----:--]",
                                level: "error",
                                message: `Socket disconnected: ${reason}`
                            });

                            writeToLog(disconnectedMessage);

                            setTimeout(
                                () => {
                                    if (__logInterval) {
                                        const stoppingMonitorsMessage = JSON.stringify({
                                            timestamp: new Date().toISOString(),
                                            label: "[-----:--]",
                                            level: "error",
                                            message: "Stopping monitors"
                                        });

                                        clearInterval(__logInterval);
                                        writeToLog(stoppingMonitorsMessage);
                                        scrollElementToLastChild(__logList);

                                        stopMonitors(socket);
                                    }
                                },
                                30000);
                        })
                    .on(
                        "log",
                        writeLogMessage(__logList))
                    .on(
                        "cpu",
                        updateCpuCharts(__cpuUsage, new Date()))
                    .on(
                        "resize-complete",
                        result => {
                            // Wait a few seconds to get the graphs back to "idle"
                            setTimeout(
                                () => {
                                    showGeneratedFiles(__fileList, result);

                                    stopMonitors(socket);

                                    clearInterval(__logInterval);
                                },
                                5000);
                            });

                let __logInterval =
                    setInterval(
                        () => scrollElementToLastChild(__logList),
                        1000);

                const file = __fileSelector.files[0];

                setTimeout(
                    () => socket.emit(`resize-${strategy}`, file.name, file),
                    5000);
            };

const runWorkerThreadDemo = runDemo(DEMO.WORKER_THREAD);

const DEMO_RUNNERS = Object.freeze({
    [DEMO.SERIAL]: runDemo(DEMO.SERIAL),
    [DEMO.PARALLEL]: runDemo(DEMO.PARALLEL),
    [DEMO.CHILD_PROCESS]: runDemo(DEMO.CHILD_PROCESS),
    [DEMO.WORKER_THREAD]: runDemo(DEMO.WORKER_THREAD),
    [DEMO.THREAD_POOL]: runDemo(DEMO.THREAD_POOL)
});

window.addEventListener(
    "load",
    () => {
        Reveal.initialize({
            disableLayout: true,
            hash: true,
            plugins: [
                RevealHighlight,
                RevealMarkdown,
                RevealMermaid,
                RevealNotes
            ]
        });

        const socket = io("ws://localhost", { transports: [ "websocket" ] });

        Object
            .values(DEMO)
            .forEach(strategy => {
                document
                    .getElementById(`startButton_${strategy}`)
                    .addEventListener("mouseup", () => DEMO_RUNNERS[strategy](socket))
            });
    });
