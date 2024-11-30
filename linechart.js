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
    const country_data = data.filter(d => d.country === country);



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

    const avg_data = movingAverage(country_data, 1); // 1 year moving average == no moving average
    const xScale = d3.scaleTime()
        .domain(d3.extent(avg_data, d => d.year))
        .range([margins.left, width - margins.right]);




        const paddingPercentage = 0.1; // 10% padding

        const yScales = {
            gdp: createPaddedScale(country_data, d => d.gdp),
            gdp_capita: createPaddedScale(country_data, d => d.gdp_capita),
            pop: createPaddedScale(country_data, d => d.pop),
            poverty: createPaddedScale(country_data, d => d.poverty),
            crime: createPaddedScale(country_data, d => d.crime),
            unemployment: createPaddedScale(country_data, d => d.unemployment)
        };
        
        function createPaddedScale(data, accessor) {
            const extent = d3.extent(data, accessor);
            const range = extent[1] - extent[0];
            const padding = range * paddingPercentage;
            return d3.scaleLinear()
                .domain([extent[0] - padding, extent[1] + padding])
                .range([height - margins.bottom, margins.top]);
        }

    // const yScales = {
    //     gdp: d3.scaleLinear().domain(d3.extent(country_data, d => d.gdp)).range([height - margins.bottom, margins.top]),
    //     gdp_capita: d3.scaleLinear().domain(d3.extent(country_data, d => d.gdp_capita)).range([height - margins.bottom, margins.top]),
    //     pop: d3.scaleLinear().domain(d3.extent(country_data, d => d.pop)).range([height - margins.bottom, margins.top]),
    //     poverty: d3.scaleLinear().domain(d3.extent(country_data, d => d.poverty)).range([height - margins.bottom, margins.top]),
    //     crime: d3.scaleLinear().domain(d3.extent(country_data, d => d.crime)).range([height - margins.bottom, margins.top]),
    //     unemployment: d3.scaleLinear().domain(d3.extent(country_data, d => d.unemployment)).range([height - margins.bottom, margins.top])
    // };

    function onDropdownChange() {
        const metric1 = document.getElementById("metric1").value;
        const metric2 = document.getElementById("metric2").value;
        const selectedMetrics = [metric1, metric2].filter(m => m);
        svg.selectAll("*").remove();

        svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", margins.left)  // Starting position at the left margin
        .attr("width", width - margins.left - margins.right + 5)  // Width should be full minus left and right margins
        .attr("height", height + margins.top);  // Height should be full minus top and bottom margins
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
            const color = idx === 0 ?  "RGB(207, 0, 0)" : "RGB(45, 175, 236 )" ;
            drawYAxis(yScale, position, metric);
            drawLine(avg_data, metric, color, yScale);
            drawPoints(avg_data, metric, color, yScale);
        });
        addHoverEffect(metrics);
    }

    function drawXAxis(xScale) {
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y"));
        svg.append("g")
            .attr("transform", `translate(0, ${height - margins.bottom})`)
            .attr("class", "x-axis")
            .call(xAxis)
            .selectAll("text")
            .style("font-size", "12px"); // Set font size for tick labels
    }

    function drawYAxis(yScale, position, metric) {
        const yAxis = position === "right" ? d3.axisRight(yScale) : d3.axisLeft(yScale);
        const transform = position === "right" ? `translate(${width - margins.right}, 0)` : `translate(${margins.left}, 0)`;
        const color = position === "right" ? "RGB(45, 175, 236 )": "RGB(207, 0, 0)" ;
        svg.append("g")
            .attr("transform", transform)
            .attr("class", position === "right" ? "y-axis-right" : "y-axis-left")
            .call(yAxis)
            .append("text")
            .attr("fill", color)
            .attr("transform", `translate(${position === "right" ? 60 : -60}, ${height / 2}) rotate(${position === "right" ? 90 : -90})`)
            .attr("text-anchor", "middle")
            .text(metricNames[metric])
            .attr("font-size", "15px");

            svg.selectAll(`.${position === "right" ? "y-axis-right" : "y-axis-left"} .tick text`)
            .attr("font-size", "12px");
    }

    function drawLine(data, metric, color, yScale) {
        const line = d3.line()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.year))
            .y(d => yScale(d[metric]));
    
        svg.append("path")
            .datum(data)
            .attr("class", `line-${metric}`) // Assign a class unique to the metric
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("d", line)
            .attr("clip-path", "url(#clip)");
    }

    function drawPoints(data, metric, color, yScale) {
        svg.selectAll(`.point-${metric}`)
            .data(data)
            .enter()
            .append("circle")
            .attr("class", `point-${metric}`)
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d[metric]))
            .attr("r", 3)
            .attr("fill", color)
            .attr("clip-path", "url(#clip)");
    }

    //// HOVER EFFECT ////

    function addHoverEffect(metrics) {
        const focus = svg.append("g")
            .attr("class", "focus")
            .style("display", "none");

        focus.append("line")
            .attr("class", "hover-line")
            .attr("y1", 0)
            .attr("y2", height - margins.bottom)
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "3,3");

        focus.append("text")
            .attr("class", "hover-year")
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .attr("font-size", "15px")
            .attr("font-weight", "bolder");

        metrics.forEach((metric, idx) => {
            const color = idx === 0 ? "RGB(207,0,0)": "RGB(45, 175, 236 )" ;
            focus.append("text")
                .attr("class", `hover-text-${metric}`)
                .attr("fill", color)
                .attr("text-anchor", "start")
                .attr("font-size", "15px")
                .attr("font-weight", "bolder");
        });


        //// HOVER EFFECT ////

        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseover", () => focus.style("display", null))
            .on("mouseout", () => focus.style("display", "none"))
            .on("mousemove", mousemove);

            function mousemove(event) {
                const transform = d3.zoomTransform(svg.node());
                const newXScale = transform.rescaleX(xScale);
                const x0 = newXScale.invert(d3.pointer(event)[0]);
                const bisectDate = d3.bisector(d => d.year).left;
                const i = bisectDate(avg_data, x0, 1);
                const d0 = avg_data[i - 1];
                const d1 = avg_data[i];
                const d = x0 - d0.year > d1.year - x0 ? d1 : d0;
            
                focus.select(".hover-line")
                    .attr("transform", `translate(${newXScale(d.year)},0)`);
            
                focus.select(".hover-year")
                    .attr("transform", `translate(${newXScale(d.year)},${height - margins.bottom + 30})`)
                    .text(d3.timeFormat("%Y")(new Date(d.year.getFullYear() + 1, 0, 1)));
            
                // Calculate y-coordinates for hover texts
                const yCoords = metrics.map(metric => ({
                    metric,
                    y: yScales[metric](d[metric])
                }));
            
                // Sort y-coordinates
                yCoords.sort((a, b) => a.y - b.y);
            
                // Adjust y-coordinates to avoid overlap
                const minDistance = 15;
                for (let i = 1; i < yCoords.length; i++) {
                    if (yCoords[i].y - yCoords[i - 1].y < minDistance) {
                        yCoords[i].y = yCoords[i - 1].y + minDistance;
                    }
                }
            
                // Update hover texts with adjusted y-coordinates
                yCoords.forEach(({ metric, y }) => {
                    focus.select(`.hover-text-${metric}`)
                        .attr("transform", `translate(${newXScale(d.year) + 5},${y - 5})`)
                        .text(`${d[metric]}`);
                });
            }

            ////// ZOOM ////////
            
            const zoom = d3.zoom()
                .scaleExtent([1, 4.5]) // Zoom limits
                .translateExtent([[0, 0], [width, height]]) // Pan limits
                .on("zoom", zoomed);
            
            svg.call(zoom);
            
            function zoomed(event) {
                const transform = event.transform;
                const newXScale = transform.rescaleX(xScale);
            
    // Update the x-axis with the new scale
                svg.select(".x-axis")
                    .call(d3.axisBottom(newXScale).tickFormat(d3.timeFormat("%Y")))
                    .selectAll("text")
                    .style("font-size", "12px");

            
                // Update lines and points for each metric
                Object.keys(yScales).forEach(metric => {
                    const line = svg.select(`.line-${metric}`);
                    const points = svg.selectAll(`circle.point-${metric}`);
            
                    // Update the line path with the new x-scale
                    line.attr("d", d3.line()
                        .curve(d3.curveMonotoneX)
                        .x(d => newXScale(d.year)) // Apply the new x-scale
                        .y(d => yScales[metric](d[metric])) // Y scale remains constant
                    );
            
                    // Update the points with the new x-scale
                    points.attr("cx", d => newXScale(d.year));
                });
            
                // Update the hover effect
                svg.selectAll(".overlay").on("mousemove", mousemove);
        }
    }
});