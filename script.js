let stockChart = null; 

document.getElementById("stock-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const stockSymbol = document.getElementById("stock-symbol").value.trim().toUpperCase();
    const stockDataDiv = document.getElementById("stock-data");
    const chartContainer = document.getElementById("chart-container");
    const predictionContainer = document.getElementById("prediction-container");

    stockDataDiv.innerHTML = "<p>Cargando datos...</p>";
    chartContainer.style.display = "none"; 
    predictionContainer.style.display = "none";

    const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=${stockSymbol}&lang=en-US&modules=assetProfile%2CsummaryProfile%2CfundProfile%2CquoteType`;
    const options = {
        method: "GET",
        headers: {
            "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
            "x-rapidapi-key": "6d22ee9125msh5b5649ab33383b4p1df567jsn30a37e23561f",
        },
    };

    fetch(apiUrl, options)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Error al obtener los datos.");
            }
            return response.json();
        })
        .then((data) => {
            const profile = data.quoteSummary?.result?.[0];
            const assetProfile = profile?.assetProfile;
            const quoteType = profile?.quoteType;

            if (!assetProfile) {
                stockDataDiv.innerHTML = "<p>No se encontró información para el símbolo ingresado.</p>";
                return;
            }

            stockDataDiv.innerHTML = `
                <h2>${quoteType?.longName || "Nombre no disponible"}</h2>
                <p><strong>Industria:</strong> ${assetProfile.industry || "N/A"}</p>
                <p><strong>Sector:</strong> ${assetProfile.sector || "N/A"}</p>
                <p><strong>Resumen:</strong> ${assetProfile.longBusinessSummary || "No disponible"}</p>
                <p><strong>Sitio web:</strong> <a href="${assetProfile.website}" target="_blank">${assetProfile.website || "No disponible"}</a></p>
            `;

            loadStockChart(stockSymbol);
        })
        .catch((error) => {
            stockDataDiv.innerHTML = `<p style="color: red;">Error al cargar los datos: ${error.message}</p>`;
        });
});

function loadStockChart(stockSymbol) {
    const chartApiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-chart?interval=1d&symbol=${stockSymbol}&range=1mo&region=US`;
    const options = {
        method: "GET",
        headers: {
            "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
            "x-rapidapi-key": "6d22ee9125msh5b5649ab33383b4p1df567jsn30a37e23561f",
        },
    };

    fetch(chartApiUrl, options)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Error al cargar el gráfico.");
            }
            return response.json();
        })
        .then((data) => {
            const timestamps = data.chart.result[0].timestamp;
            const prices = data.chart.result[0].indicators.quote[0].close;

            if (!timestamps || !prices) {
                throw new Error("No hay datos suficientes para el gráfico.");
            }

            const labels = timestamps.map((timestamp) =>
                new Date(timestamp * 1000).toLocaleDateString()
            );

            const ctx = document.getElementById("stock-chart").getContext("2d");

            if (stockChart) {
                stockChart.destroy();
            }

            stockChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: `Precio de ${stockSymbol}`,
                            data: prices,
                            borderColor: "rgba(75, 192, 192, 1)",
                            backgroundColor: "rgba(75, 192, 192, 0.2)",
                            fill: true,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                        },
                    },
                },
            });

            document.getElementById("chart-container").style.display = "block";

            predictStockPrice(prices);
        })
        .catch((error) => {
            document.getElementById("stock-data").innerHTML += `<p style="color: red;">Error al cargar el gráfico: ${error.message}</p>`;
        });
}

function predictStockPrice(prices) {
    const days = Array.from({ length: prices.length }, (_, i) => i);
    const regression = linearRegression(days, prices);

    const nextDay = days.length;
    const predictedPrice = regression.slope * nextDay + regression.intercept;

    const predictionContainer = document.getElementById("prediction-container");
    predictionContainer.style.display = "block";

    const predictedPriceElement = document.getElementById("predicted-price");
    const indicatorElement = document.getElementById("indicator");

    predictedPriceElement.textContent = `${predictedPrice.toFixed(2)} USD`;

    if (predictedPrice > prices[prices.length - 1]) {
        indicatorElement.style.color = "green";
        indicatorElement.textContent = "⬆️ Subirá";
    } else {
        indicatorElement.style.color = "red";
        indicatorElement.textContent = "⬇️ Bajará";
    }
}

function linearRegression(X, Y) {
    const n = X.length;
    const meanX = X.reduce((a, b) => a + b) / n;
    const meanY = Y.reduce((a, b) => a + b) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (X[i] - meanX) * (Y[i] - meanY);
        den += (X[i] - meanX) ** 2;
    }

    const slope = num / den; 
    const intercept = meanY - slope * meanX; 
    return { slope, intercept };
}
