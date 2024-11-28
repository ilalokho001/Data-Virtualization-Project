const urlParams = new URLSearchParams(window.location.search);
const country = urlParams.get("country");
document.getElementById('countryName').textContent = country;


d3.csv("final_output.csv", d => {
    return {
        gdp: +d["GDP (in Trillions USD)"],
        gdp_capita: +d["GDP per Capita (in USD)"],
        pop: +d["Population (in Millions)"],
        year: new Date(d["Year"]),
        country: d["Country"],
        poverty: +d["Poverty Rate (%)"],
        crime: +d["Crime Rate (per 100,000)"],
        unemployment: +d["Unemployment Rate (%)"],
    };
}).then(data => {
    const metricNames = {
        gdp: "GDP (in Trillions USD)",
        gdp_capita: "GDP per Capita (in USD)",
        pop: "Population (in Millions)",
        poverty: "Poverty Rate (%)",
        crime: "Crime Rate (per 100,000)",
        unemployment: "Unemployment Rate (%)"
    };
    const margins = { top: 30, right: 80, bottom: 40, left: 80 };
    const svg = d3.select("#lineChart");
    const height = 600;
    const width = 800;
    svg.attr("viewBox", `0, 0, ${width}, ${height}`);
    const usa_data = data.filter(d => d.country === country);

    function movingAverage(data, window) {
        return data.map((d, curr) => {
            if (curr + window > data.length) return null;

            let sums = { gdp: 0, gdp_capita: 0, pop: 0, poverty: 0, crime: 0, unemployment: 0 };
            for (let i = curr; i < curr + window; i++) {
                sums.gdp += data[i].gdp;
                sums.gdp_capita += data[i].gdp_capita;
                sums.pop += data[i].pop;
                sums.poverty += data[i].poverty;
                sums.crime += data[i].crime;
                sums.unemployment += data[i].unemployment;
            }

            return {
                year: new Date(data[curr + Math.floor(window / 2)].year),
                gdp: sums.gdp / window,
                gdp_capita: sums.gdp_capita / window,
                pop: sums.pop / window,
                poverty: sums.poverty / window,
                crime: sums.crime / window,
                unemployment: sums.unemployment / window,
            };
        }).filter(d => d !== null);
    }

    const avg_data = movingAverage(usa_data, 3);
    const xScale = d3.scaleLinear()
        .domain(d3.extent(avg_data, d => d.year))
        .range([margins.left, width - margins.right]);

    const yScales = {
        gdp: d3.scaleLinear().domain(d3.extent(usa_data, d => d.gdp)).range([height - margins.bottom, margins.top]),
        gdp_capita: d3.scaleLinear().domain(d3.extent(usa_data, d => d.gdp_capita)).range([height - margins.bottom, margins.top]),
        pop: d3.scaleLinear().domain(d3.extent(usa_data, d => d.pop)).range([height - margins.bottom, margins.top]),
        poverty: d3.scaleLinear().domain(d3.extent(usa_data, d => d.poverty)).range([height - margins.bottom, margins.top]),
        crime: d3.scaleLinear().domain(d3.extent(usa_data, d => d.crime)).range([height - margins.bottom, margins.top]),
        unemployment: d3.scaleLinear().domain(d3.extent(usa_data, d => d.unemployment)).range([height - margins.bottom, margins.top])
    };


    function onDropdownChange() {
        const metric1 = document.getElementById("metric1").value;
        const metric2 = document.getElementById("metric2").value;
        const selectedMetrics = [metric1, metric2].filter(m => m);
        svg.selectAll("*").remove();
        if (selectedMetrics.length > 0) {
            drawAxesAndLines(selectedMetrics);
        }
    }

    document.getElementById("metric1").addEventListener("change", onDropdownChange);
    document.getElementById("metric2").addEventListener("change", onDropdownChange);

    function drawAxesAndLines(metrics) {
        drawXAxis(xScale);
        metrics.forEach((metric, idx) => {
            const yScale = yScales[metric];
            const position = idx === 0 ? "left" : "right";
            const color = idx === 0 ? "blue" : "red";
            drawYAxis(yScale, position, metric);
            drawLine(avg_data, metric, color, yScale);
        });
    }

    function drawXAxis(xScale) {
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y"));
        svg.append("g")
            .attr("transform", `translate(0, ${height - margins.bottom})`)
            .call(xAxis);
    }

    function drawYAxis(yScale, position, metric) {
        const yAxis = position === "right" ? d3.axisRight(yScale) : d3.axisLeft(yScale);
        const transform = position === "right" ? `translate(${width - margins.right}, 0)` : `translate(${margins.left}, 0)`;
        const color = position === "right" ? "red" : "blue";
        svg.append("g")
            .attr("transform", transform)
            .call(yAxis)
            .append("text")
            .attr("fill", color)
            .attr("transform", `translate(${position === "right" ? 60 : -60}, ${height / 2}) rotate(${position === "right" ? 90 : -90})`)
            .attr("text-anchor", "middle")
            .text(metricNames[metric])
            .attr("font-size", "20px");
    }

    function drawLine(data, metric, color, yScale) {
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d[metric]));

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("d", line);
    }
});