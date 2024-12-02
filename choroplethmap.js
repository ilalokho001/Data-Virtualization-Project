function resize() {
    const container = document.querySelector(".container");
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Update SVG dimensions
    svg.attr("width", width).attr("height", height);

    // Update projection scale and fit
    projection.fitExtent([[0.5, 0.5], [width - 0.5, height - 0.5]], outline);

    // Update paths and re-render the map
    path.projection(projection);
    drawMap(worldData);
}

function visualizeMap(svg) {
    let hasVisualizedMap = false; // Track the current visualization
    let isOrthographic = false; // Track current projection type
    let worldData;
    let minGDP, maxGDP; // Global min and max GDP values

    const outline = { type: "Sphere" };
    const ease = d3.easeCubicInOut;

    let projection = d3.geoEquirectangular()
        .fitExtent([[0.5, 0.5], [width - 0.5, height - 0.5]], outline); // Initialize projection - Equal Rectangular
    const path = d3.geoPath().projection(projection);

    const graticule = d3.geoGraticule(); // for grid lines

    // Code of the six countries
    const countryCode = {
        "840": { name: "USA" },
        "643": { name: "Russia" },
        "124": { name: "Canada" },
        "156": { name: "China" },
        "356": { name: "India" },
        "036": { name: "Australia" }
    };

    const countryColors = {};
    let csv_dataset = {};
    let yearData = [];

    // Initial color of the maps before visualization
    const greyColorScale = d3.scaleOrdinal()
        .domain([1, 2, 3, 4, 5, 6])
        .range(["#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#606060", "#404040"]);

    // Initializing the color that will be used later to visualize the map
    let colorScale = d3.scaleSequential(d3.interpolateReds);

    Promise.all([
        d3.json("map.json"),
        d3.csv("final_output.csv")
    ]).then(function (loadData) {
        let topo = loadData[0];
        csv_dataset = loadData[1];

        worldData = topojson.feature(topo, topo.objects.countries);

        // Calculate global min and max GDP values
        minGDP = d3.min(csv_dataset, d => +d["GDP (in Trillions USD)"]);
        maxGDP = d3.max(csv_dataset, d => +d["GDP (in Trillions USD)"]);

        // Define custom bins for GDP (commented out)
        // const thresholds = [0.5, 1, 2, 5, 10, 15, 25];
        // const colors = d3.schemeReds[thresholds.length + 1];

        // Create a logarithmic scale for GDP
        colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([Math.log(minGDP), Math.log(maxGDP)]);

        // Create a mapping from country code to a grey color
        Object.keys(countryCode).forEach((key, index) => {
            countryColors[key] = greyColorScale(index + 1);
        });

        // Draw the initial map with globe data
        drawMap(worldData);

        //window.addEventListener("resize", resize); 
        //resize();

        // Add dragging and rotating
        svg.call(d3.drag().on("drag", function (event) {
            if (isOrthographic) {
                const rotate = projection.rotate();
                const k = 360 / width; // 360 degrees / width of the SVG

                projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);

                svg.selectAll("path").attr("d", path); // update the path of the globe
            }
        }));

        // Switch projection button event
        document.getElementById("toggleButton").addEventListener("click", toggleProjection);

        // Visualize data button event
        document.getElementById("visualizeButton").addEventListener("click", visualizeData);

        // Add slider event
        sliderEvent();
    });

    function drawMap(data) {
        // Clear any existing map paths
        svg.selectAll("path").remove();

        // Draw sphere
        svg.append("path")
            .datum(outline)
            .attr("class", "sphere")
            .attr("d", path)
            .attr("fill", "lightblue");

        // Draw graticule for orthographic projection
        svg.append("path")
            .datum(graticule())
            .attr("class", "graticule")
            .attr("d", path)
            .attr("stroke", "#ccc")
            .attr("fill", "lightblue");

        // Draw countries
        svg.append("g")
            .selectAll("path.country")
            .data(data.features)
            .enter()
            .append("path")
            .attr("class", "country")
            .attr("d", path)
            .attr("fill", function (d, i) {
                if (!hasVisualizedMap) {
                    const country = countryColors[d.id];
                    return country ? country : "aliceblue"; // Assign color if country is in the list, otherwise alice blue
                } else {
                    const countryInfo = countryCode[d.id];
                    if (countryInfo) {
                        const countryData = yearData.find(data => data.Country == countryInfo.name);
                        if (countryData) {
                            return colorScale(Math.log(+countryData["GDP (in Trillions USD)"]));
                        }
                    } else {
                        return "aliceblue";
                    }
                }
            })
            .attr("stroke", "grey")
            .on("click", function (event, d) {
                const countryId = d.id;
                const countryName = countryCode[countryId].name;

                if (countryName) {
                    const panel = document.getElementById("comparePanel");
                    let selectedOption = document.getElementById("options");
                    selectedOption.value = "option1-3";

                    // Pass the country name via URL parameter to the iframe
                    const iframe = document.getElementById("contentFrame");
                    iframe.src = `linechart.html?country=${encodeURIComponent(countryName)}`;

                    panel.style.display = "block";

                    // Adjust layout
                    const contentContainer = document.querySelector(".popupContainer");
                    contentContainer.style.marginRight = "620px";
                }
            });

        // Add tooltip
        if(!hasVisualizedMap){
            const tooltip = d3.select("#mapToolTip");

            svg.selectAll("path.country")
                .on("mouseenter", (m, d) => {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9)

                    let divContent = countryCode[d.id] ? `<div><span style=font-weight: bold;> Country: </span>${countryCode[d.id].name}</div>` : "Undefined";
                    let left = m.clientX + 10;
                    let top = m.clientY + 10;

                    tooltip.html(`<div></div>
                        ${divContent}
                        <div></div>`)

                        .style("left", `${left}px`)
                        .style("top", `${top}px`);
                })
                .on("mousemove", (m, d) => {
                    let left = m.clientX + 10;
                    let top = m.clientY + 10;

                    tooltip.style("left", `${left}px`)
                        .style("top", `${top}px`)
                })
                .on("mouseleave", () => {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0);
                });
        }

        if(hasVisualizedMap){
            const yearSlider = d3.select("#yearSlider");
            let currentValue = parseInt(yearSlider.node().value);
            updateMap(currentValue)
        }
    }

    // Toggle between Orthographic and Equal Rectangular projections
    function toggleProjection() {
        const startProjection = isOrthographic ? d3.geoOrthographicRaw : d3.geoEquirectangularRaw;
        const endProjection = isOrthographic ? d3.geoEquirectangularRaw : d3.geoOrthographicRaw;

        const interpolate = interpolateProjection(startProjection, endProjection);

        let j = 0, m = 45;

        requestAnimationFrame(transition);

        isOrthographic = !isOrthographic;

        function transition() {
            const t = Math.min(1, ease(j / m));
            projection = interpolate(t);
            path.projection(projection);
            drawMap(worldData)

            if (t < 1) {
                j++;
                requestAnimationFrame(transition);
            }

            if (t === 1 && isOrthographic) {
                projection = d3.geoOrthographic()
                    .fitExtent([[0.5, 0.5], [width - 0.5, height - 0.5]], outline)
                    .translate([width / 2, height / 2])
                    .clipAngle(90);
                path.projection(projection);
                drawMap(worldData);
            }
        }

    }

    function interpolateProjection(raw0, raw1) {
        const { scale: scale0, translate: translate0 } = fit(raw0);
        const { scale: scale1, translate: translate1 } = fit(raw1);

        return t => d3.geoProjection((x, y) => interpolate2(raw0(x, y), raw1(x, y), t))
            .scale(interpolate1(scale0, scale1, t))
            .translate(interpolate2(translate0, translate1, t))
            .precision(0.1);
    }

    // Function to calculate the scaling and translation for each projection
    function fit(raw) {
        const p = d3.geoProjection(raw).fitExtent([[0.5, 0.5], [width - 0.5, height - 0.5]], outline);
        return { scale: p.scale(), translate: p.translate() };
    }

    // Linear interpolation functions
    function interpolate1(x0, x1, t) {
        return (1 - t) * x0 + t * x1;
    }

    function interpolate2([x0, y0], [x1, y1], t) {
        return [(1 - t) * x0 + t * x1, (1 - t) * y0 + t * y1];
    }

    function visualizeData() {
        const button = document.getElementById("visualizeButton");
        const sliderContainer = document.querySelector(".slider"); 
        const currentYear = parseInt(document.getElementById("yearSlider").value);

        if (!hasVisualizedMap) {
            sliderContainer.style.display = "block";
            sliderContainer.style.opacity = 0;
            setTimeout(() => {
                sliderContainer.style.transition = "all 0.5s ease"; // Add a smooth transition
                sliderContainer.style.opacity = 1;
            }, 500);
        
            // Visualize the data
            updateMap(currentYear);
            button.textContent = "Initialize Visualization";
            hasVisualizedMap = true;
        
            // Show the compare button with a smooth transition
            const compareButton = document.getElementById('compareButton');
            compareButton.style.display = "inline-block";
            compareButton.style.opacity = 0;
            setTimeout(() => {
                compareButton.style.transition = "all 0.5s ease"; // Add a smooth transition
                compareButton.style.opacity = 1;
            }, 500);
        
        } else {
            sliderContainer.style.transition = "all 0.5s ease"; 
            sliderContainer.style.opacity = 0;
            setTimeout(() => {
                sliderContainer.style.display = "none";
            }, 500);
        
            // Reset visualization
            button.textContent = "Visualize Data on Map";
            hasVisualizedMap = false;
            drawMap(worldData);
        
            // Hide the compare button
            const compareButton = document.getElementById('compareButton');
            compareButton.style.transition = "all 0.5s ease"; 
            compareButton.style.opacity = 0;
            setTimeout(() => {
                compareButton.style.display = "none";
            }, 500);
        }
    }

    function updateMap(year) {
        // Filter the dataset for the selected year
        yearData = csv_dataset.filter(d => d.Year == year);

        // Use the global min and max GDP values for the color scale
        colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([Math.log(minGDP), Math.log(maxGDP)]);

        svg.selectAll("path.country")
            .transition()
            .duration(500) // Adjust the duration for smoother transitions
            .attr("fill", function (d) {
                const countryInfo = countryCode[d.id];
                if (countryInfo) {
                    const countryData = yearData.find(data => data.Country == countryInfo.name);
                    if (countryData) {
                        return colorScale(Math.log(+countryData["GDP (in Trillions USD)"]));
                    }
                }
                return "aliceblue";
            });

        // Update tooltip with current year and GDP
        svg.selectAll("path.country")
            .on("mouseenter", (m, d) => {
                const countryInfo = countryCode[d.id];
                let left = m.clientX + 10;
                let top = m.clientY + 10;

                if (countryInfo) {
                    const countryData = yearData.find(data => data.Country == countryInfo.name);

                    const divContent = `<div><span> Country: </span>${countryData["Country"]}</div>
                <div><span> Year: </span>${year}</div>
                 <div><span> GDP (in Trillions USD): </span>$${countryData["GDP (in Trillions USD)"]} trillion</div>`

                    if (countryData) {
                        d3.select("#mapToolTip").transition()
                            .duration(200)
                            .style("opacity", .9)

                        d3.select("#mapToolTip").html(`<div></div>
                            ${divContent}
                            <div></div>`)
                            .style("left", `${left}px`)
                            .style("top", `${top}px`);
                    }
                }
            })
            .on("mousemove", (m, d) => {
                let left = m.clientX + 10;
                let top = m.clientY + 10;

                d3.select("#mapToolTip")
                    .style("left", `${left}px`)
                    .style("top", `${top}px`);
            })
            .on("mouseleave", () => {
                d3.select("#mapToolTip").transition()
                    .duration(200)
                    .style("opacity", 0);
            });
    }

    function sliderEvent() {
        const yeartooltip = d3.select(".yearToolTip");
        const yearSlider = d3.select("#yearSlider");

        function updateTooltip(value) {
            const slider = yearSlider.node();
            const rect = slider.getBoundingClientRect();
            const sliderOffsetTop = slider.offsetTop;

            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);

            const sliderPercentage = (value - min) / (max - min);
            const sliderThumbWidth = 20;
            const handlePosition = rect.left + sliderPercentage * (rect.width - sliderThumbWidth) + (sliderThumbWidth / 2);

            const tooltipHeight = slider.offsetHeight;

            yeartooltip
                .style("left", `${handlePosition}px`)
                .style("top", `${sliderOffsetTop - 50}px`)
                .style("display", "block")
                .html(value)
        }

        yearSlider.on("input", function () {
            const value = this.value;
            updateTooltip(value);
            updateMap(value);
        });

        yearSlider.on("mouseover", function () {
            const value = this.value;
            updateTooltip(value);
        });

        yearSlider.on("mouseout", function () {
            yeartooltip.style("display", "none"); // Hide the tooltip when leaving the slider
        });

        // Event listeners for 2000 and 2023 button
        document.getElementById("startYear").addEventListener("click", function () {
            yearSlider.node().value = 2000; // Update the slider's value
            updateTooltip(2000);
            updateMap(2000);
        });

        document.getElementById("endYear").addEventListener("click", function () {
            yearSlider.node().value = 2023; // Update the slider's value
            updateTooltip(2023);
            updateMap(2023);
        });

        document.querySelector(".timeLapse").addEventListener("click", function () {
            let currentValue = parseInt(yearSlider.node().value);
            let startValue = 2000;
            let endValue = 2023;
            let increment = 1;

            // Function to simulate time-lapse
            function timeLapse() {
                if (currentValue <= endValue) {
                    yearSlider.node().value = currentValue;
                    updateTooltip(currentValue);
                    updateMap(currentValue);

                    currentValue += increment;
                    setTimeout(timeLapse, 500); // Adjust the timeout to match the transition duration
                }
            }

            // Check if the current value is at or beyond the end value
            if (currentValue == endValue) {
                currentValue = startValue;
                yearSlider.node().value = currentValue;
                updateTooltip(currentValue); // Update tooltip with the start value
                updateMap(currentValue);
                timeLapse();
            } else {
                timeLapse(); // Start the time-lapse animation
            }

        });
    }
}