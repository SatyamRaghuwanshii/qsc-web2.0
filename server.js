// QSC-WEB/backend/server.js (COMPLETE CODE WITH ALL FIXES)

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const PDFDocument = require('pdfkit');

const Project = require('./models/Project');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qsc_app';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---

app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend API is working!' });
});

app.post('/api/projects', async (req, res) => {
    try {
        const { projectName, description, calculations } = req.body;

        if (!projectName || !calculations) {
            return res.status(400).json({ message: 'Project name and calculations are required.' });
        }

        const newProject = new Project({
            projectName,
            description,
            calculations
        });

        const savedProject = await newProject.save();
        res.status(201).json(savedProject);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A project with this name already exists. Please choose a different name.' });
        }
        console.error('Error saving project:', error);
        res.status(500).json({ message: 'Error saving project', error: error.message });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const { name } = req.query;

        let projects;
        if (name) {
            projects = await Project.findOne({ projectName: name });
            if (!projects) {
                return res.status(404).json({ message: `Project with name "${name}" not found.` });
            }
        } else {
            projects = await Project.find({});
        }

        res.status(200).json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
});

app.put('/api/projects/:projectName', async (req, res) => {
    try {
        const { projectName } = req.params;
        const { description, calculations } = req.body;

        if (!calculations) {
            return res.status(400).json({ message: 'Calculations data is required for update.' });
        }

        const updatedProject = await Project.findOneAndUpdate(
            { projectName: projectName },
            { description, calculations, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        res.status(200).json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Error updating project', error: error.message });
    }
});

app.delete('/api/projects/:projectName', async (req, res) => {
    try {
        const { projectName } = req.params;

        const deletedProject = await Project.findOneAndDelete({ projectName: projectName });

        if (!deletedProject) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        res.status(200).json({ message: 'Project deleted successfully', deletedProjectName: deletedProject.projectName });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Error deleting project', error: error.message });
    }
});

app.post('/api/reports/csv', (req, res) => {
    try {
        const { projectName, calculations } = req.body;

        if (!projectName || !calculations || calculations.length === 0) {
            return res.status(400).json({ message: 'Project name and calculations are required for report generation.' });
        }

        let csvContent = 'Project Name,Material Type,Item Name,Length (m),Width (m),Height (m),Thickness (m),Plaster Area (sqm),Plaster Thickness (m),Calculated Bricks (Nos),Calculated Cement (bags),Calculated Sand (m3),Calculated Aggregate (m3),Calculated Wet Volume (m3),Waste Factor (%)\n';

        calculations.forEach(calc => {
            const wasteFactor = calc.wasteFactor || 0;
            let calculatedBricks = '';
            let calculatedCementBags = '';
            let calculatedSandM3 = '';
            let calculatedAggregateM3 = '';
            let calculatedWetVolumeM3 = '';
            let plasterArea = '';
            let plasterThickness = '';

            if (calc.calculated) {
                if (calc.type === 'bricks') {
                    calculatedBricks = calc.calculated.totalBricks ? calc.calculated.totalBricks.toFixed(0) : '';
                    calculatedCementBags = calc.calculated.cementMortarBags ? calc.calculated.cementMortarBags.toFixed(1) : '';
                    calculatedSandM3 = calc.calculated.sandMortarVolume ? calc.calculated.sandMortarVolume.toFixed(2) : '';
                } else if (calc.type === 'concrete') {
                    calculatedCementBags = calc.calculated.cementBags ? calc.calculated.cementBags.toFixed(1) : '';
                    calculatedSandM3 = calc.calculated.sandVolume ? calc.calculated.sandVolume.toFixed(2) : '';
                    calculatedAggregateM3 = calc.calculated.aggregateVolume ? calc.calculated.aggregateVolume.toFixed(2) : '';
                    calculatedWetVolumeM3 = calc.calculated.wetVolume ? calc.calculated.wetVolume.toFixed(2) : '';
                } else if (calc.type === 'plaster') {
                    plasterArea = calc.plasterArea ? calc.plasterArea.toFixed(2) : '';
                    plasterThickness = calc.plasterThickness ? calc.plasterThickness.toFixed(3) : '';
                    calculatedCementBags = calc.calculated.cementBags ? calc.calculated.cementBags.toFixed(1) : '';
                    calculatedSandM3 = calc.calculated.sandVolume ? calc.calculated.sandVolume.toFixed(2) : '';
                    calculatedWetVolumeM3 = calc.calculated.wetVolume ? calc.calculated.wetVolume.toFixed(2) : '';
                }
            }
            
            const length = calc.length ? calc.length.toFixed(2) : (calc.wallLength ? calc.wallLength.toFixed(2) : '');
            const width = calc.width ? calc.width.toFixed(2) : '';
            const height = calc.height ? calc.height.toFixed(2) : (calc.wallHeight ? calc.wallHeight.toFixed(2) : '');
            const thickness = calc.thickness ? calc.thickness.toFixed(2) : (calc.wallThickness ? calc.wallThickness.toFixed(2) : '');


            csvContent += `"${projectName}",`;
            csvContent += `"${calc.type}",`;
            csvContent += `"${calc.name || 'N/A'}",`;
            csvContent += `${length},${width},${height},${thickness},`;
            csvContent += `${plasterArea},${plasterThickness},`;
            csvContent += `${calculatedBricks},${calculatedCementBags},${calculatedSandM3},${calculatedAggregateM3},${calculatedWetVolumeM3},`;
            csvContent += `${wasteFactor}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${projectName.replace(/[^a-z0-9]/gi, '_')}_Material_Report.csv"`);
        res.status(200).send(csvContent);

    } catch (error) {
        console.error('Error generating CSV report:', error);
        res.status(500).json({ message: 'Error generating CSV report', error: error.message });
    }
});

app.post('/api/reports/pdf', (req, res) => {
    try {
        const { projectName, calculations } = req.body;

        if (!projectName || !calculations || calculations.length === 0) {
            return res.status(400).json({ message: 'Project name and calculations are required for PDF report generation.' });
        }

        const doc = new PDFDocument();
        const filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}_Material_Report.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        doc.fontSize(24).text(`Project: ${projectName}`, { align: 'center' }).moveDown();
        doc.fontSize(16).text('Material Breakdown and Cost Estimate', { align: 'center' }).moveDown(1.5);

        let totalCementBags = 0;
        let totalSandM3 = 0;
        let totalAggregateM3 = 0;
        let totalBricksNos = 0;
        let totalEstimatedCost = 0;

        const materialPrices = {
            'cement_bags': 400,
            'sand_m3': 2500,
            'aggregate_m3': 1800,
            'bricks_nos': 12,
        };

        doc.fontSize(14).text('Individual Calculations:', { underline: true }).moveDown(0.5);

        if (calculations.length === 0) {
            doc.text('No calculations in this project.', { indent: 20 }).moveDown();
        } else {
            calculations.forEach((calc, index) => {
                doc.fontSize(12).text(`  ${index + 1}. ${calc.name || 'Untitled'} (${calc.type}) - Waste: ${calc.wasteFactor || 0}%`);
                
                if (calc.calculated) {
                    if (calc.type === 'bricks') {
                        const b = calc.calculated;
                        doc.fontSize(10).text(`    - Bricks: ${b.totalBricks || 'N/A'} Nos.`);
                        doc.text(`    - Mortar Cement: ${b.cementMortarBags ? b.cementMortarBags.toFixed(1) : 'N/A'} bags`);
                        doc.text(`    - Mortar Sand: ${b.sandMortarVolume ? b.sandMortarVolume.toFixed(2) : 'N/A'} m³`);
                        totalBricksNos += b.totalBricks || 0;
                        totalCementBags += b.cementMortarBags || 0;
                        totalSandM3 += b.sandMortarVolume || 0;
                    } else if (calc.type === 'concrete') {
                        const c = calc.calculated;
                        doc.fontSize(10).text(`    - Wet Volume: ${c.wetVolume ? c.wetVolume.toFixed(2) : 'N/A'} m³`);
                        doc.text(`    - Cement: ${c.cementBags ? c.cementBags.toFixed(1) : 'N/A'} bags`);
                        doc.text(`    - Sand: ${c.sandVolume ? c.sandVolume.toFixed(2) : 'N/A'} m³`);
                        doc.text(`    - Aggregate: ${c.aggregateVolume ? c.aggregateVolume.toFixed(2) : 'N/A'} m³`);
                        totalCementBags += c.cementBags || 0;
                        totalSandM3 += c.sandVolume || 0;
                        totalAggregateM3 += c.aggregateVolume || 0;
                    } else if (calc.type === 'plaster') {
                        const p = calc.calculated;
                        doc.fontSize(10).text(`    - Area: ${calc.plasterArea ? calc.plasterArea.toFixed(2) : 'N/A'} sqm`);
                        doc.text(`    - Thickness: ${calc.plasterThickness ? calc.plasterThickness.toFixed(3) : 'N/A'} m`);
                        doc.text(`    - Cement: ${p.cementBags ? p.cementBags.toFixed(1) : 'N/A'} bags`);
                        doc.text(`    - Sand: ${p.sandVolume ? p.sandVolume.toFixed(2) : 'N/A'} m³`);
                        totalCementBags += p.cementBags || 0;
                        totalSandM3 += p.sandVolume || 0;
                    }
                }
                doc.moveDown(0.5);
            });
        }
        doc.moveDown(1);


        totalEstimatedCost += totalCementBags * materialPrices.cement_bags;
        totalEstimatedCost += totalSandM3 * materialPrices.sand_m3;
        totalEstimatedCost += totalAggregateM3 * materialPrices.aggregate_m3;
        totalEstimatedCost += totalBricksNos * materialPrices.bricks_nos;

        doc.fontSize(14).text('Overall Project Summary:', { underline: true }).moveDown(0.5);
        doc.fontSize(12).text(`Total Cement: ${totalCementBags.toFixed(1)} bags`);
        doc.text(`Total Sand: ${totalSandM3.toFixed(2)} m³`);
        doc.text(`Total Aggregate: ${totalAggregateM3.toFixed(2)} m³`);
        doc.text(`Total Bricks: ${Math.ceil(totalBricksNos)} Nos.`);
        doc.moveDown(0.5);
        doc.fontSize(16).text(`Estimated Total Cost: ₹ ${totalEstimatedCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, { continued: false }).moveDown(1);
        doc.fontSize(10).text('Note: Costs are estimates based on predefined prices and should be verified with actual market rates.', { align: 'center', oblique: true });

        doc.end();

    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ message: 'Error generating PDF report', error: error.message });
    }
});


// --- API Route to Generate Floor Plan using MOCKED AI (FOR DEMONSTRATION) ---
app.post('/api/generate-floorplan-ai', (req, res) => {
    try {
        const { plotWidth, plotHeight, desiredRooms, promptText } = req.body;

        if (!plotWidth || !plotHeight) {
            return res.status(400).json({ message: 'Plot dimensions (width and height) are required.' });
        }

        // --- MOCKED AI LOGIC ---
        const mockFloorPlanTemplates = [
            {
                name: "Simple 1BHK Template",
                plotWidth: 7,
                plotHeight: 10,
                walls: [
                    {x: 0, y: 0, width: 7, height: 0.20, length: 7, thickness: 0.20, type: "external_wall", name: "Top Ext Wall"},
                    {x: 0, y: 9.80, width: 7, height: 0.20, length: 7, thickness: 0.20, type: "external_wall", name: "Bottom Ext Wall"},
                    {x: 0, y: 0.20, width: 0.20, height: 9.60, length: 9.60, thickness: 0.20, type: "external_wall", name: "Left Ext Wall"},
                    {x: 6.80, y: 0.20, width: 0.20, height: 9.60, length: 9.60, thickness: 0.20, type: "external_wall", name: "Right Ext Wall"},
                    {x: 0.20, y: 6.00, width: 6.60, height: 0.15, length: 6.60, thickness: 0.15, type: "internal_wall", name: "Bedroom-Living Wall"},
                    {x: 4.00, y: 0.20, width: 0.15, height: 5.80, length: 5.80, thickness: 0.15, type: "internal_wall", name: "Bathroom-Kitchen Wall"},
                    {x: 4.00, y: 6.15, width: 0.15, height: 3.65, length: 3.65, thickness: 0.15, type: "internal_wall", name: "Living-Dining Wall"}
                ],
                rooms: [
                    {x: 0.20, y: 0.20, width: 3.80, height: 5.80, name: "Bedroom", type: "room"},
                    {x: 4.15, y: 0.20, width: 2.65, height: 5.80, name: "Bathroom", type: "room"},
                    {x: 0.20, y: 6.15, width: 3.80, height: 3.65, name: "Living Area", type: "room"},
                    {x: 4.15, y: 6.15, width: 2.65, height: 3.65, name: "Kitchen/Dining", type: "room"}
                ]
            },
            {
                name: "Standard 2BHK Template",
                plotWidth: 10,
                plotHeight: 12,
                walls: [
                    {x: 0, y: 0, width: 10, height: 0.20, length: 10, thickness: 0.20, type: "external_wall", name: "Top Ext Wall"},
                    {x: 0, y: 11.80, width: 10, height: 0.20, length: 10, thickness: 0.20, type: "external_wall", name: "Bottom Ext Wall"},
                    {x: 0, y: 0.20, width: 0.20, height: 11.60, length: 11.60, thickness: 0.20, type: "external_wall", name: "Left Ext Wall"},
                    {x: 9.80, y: 0.20, width: 0.20, height: 11.60, length: 11.60, thickness: 0.20, type: "external_wall", name: "Right Ext Wall"},
                    {x: 0.20, y: 6.00, width: 9.60, height: 0.15, length: 9.60, thickness: 0.15, type: "internal_wall", name: "Central Horizontal Divide"},
                    {x: 4.50, y: 0.20, width: 0.15, height: 3.80, length: 3.80, thickness: 0.15, type: "internal_wall", name: "Bedroom1-Bath1 Wall"},
                    {x: 7.00, y: 4.15, width: 0.15, height: 7.65, length: 7.65, thickness: 0.15, type: "internal_wall", name: "Bedroom2-Living Wall"}
                ],
                rooms: [
                    {x: 0.20, y: 0.20, width: 4.30, height: 3.80, name: "Bedroom 1", type: "room"},
                    {x: 4.65, y: 0.20, width: 5.15, height: 3.80, name: "Kitchen", type: "room"},
                    {x: 0.20, y: 4.15, width: 6.80, height: 7.65, name: "Living/Dining", type: "room"},
                    {x: 7.15, y: 4.15, width: 2.65, height: 7.65, name: "Bedroom 2", type: "room"}
                ]
            },
            {
                name: "Combined 2BHK + Stairs Template",
                plotWidth: 12,
                plotHeight: 12,
                walls: [
                    {x: 0, y: 0, width: 12, height: 0.20, length: 12, thickness: 0.20, type: "external_wall", name: "Top Ext Wall"},
                    {x: 0, y: 11.80, width: 12, height: 0.20, length: 12, thickness: 0.20, type: "external_wall", name: "Bottom Ext Wall"},
                    {x: 0, y: 0.20, width: 0.20, height: 11.60, length: 11.60, thickness: 0.20, type: "external_wall", name: "Left Ext Wall"},
                    {x: 11.80, y: 0.20, width: 0.20, height: 11.60, length: 11.60, thickness: 0.20, type: "external_wall", name: "Right Ext Wall"},
                    {x: 0.20, y: 6.00, width: 11.60, height: 0.15, length: 11.60, thickness: 0.15, type: "internal_wall", name: "Central Horizontal Divide"},
                    {x: 4.00, y: 0.20, width: 0.15, height: 5.80, length: 5.80, thickness: 0.15, type: "internal_wall", name: "Bedroom1-Living Wall"},
                    {x: 8.00, y: 0.20, width: 0.15, height: 5.80, length: 5.80, thickness: 0.15, type: "internal_wall", name: "Kitchen-Stairwell Wall"},
                    {x: 8.00, y: 6.15, width: 0.15, height: 5.65, length: 5.65, thickness: 0.15, type: "internal_wall", name: "Bedroom2-Bathroom Wall"}
                ],
                rooms: [
                    {x: 0.20, y: 0.20, width: 3.80, height: 5.80, name: "Bedroom 1", type: "room"},
                    {x: 4.15, y: 0.20, width: 3.85, height: 5.80, name: "Living Area", type: "room"},
                    {x: 8.15, y: 0.20, width: 3.65, height: 5.80, name: "Kitchen", type: "room"},
                    {x: 0.20, y: 6.15, width: 7.80, height: 5.65, name: "Stairwell Access", type: "room"},
                    {x: 8.15, y: 6.15, width: 3.65, height: 5.65, name: "Bedroom 2", type: "room"}
                ],
                stairs: [
                    {x: 0.50, y: 6.50, width: 2.00, height: 1.00, type: "stair_segment", name: "Stair Bottom"},
                    {x: 0.50, y: 7.80, width: 2.00, height: 1.00, type: "stair_segment", name: "Stair Landing"},
                    {x: 0.50, y: 9.10, width: 2.00, height: 1.00, type: "stair_segment", name: "Stair Top"}
                ]
            }
        ];
        
        // Based on user prompt, select one of the hardcoded templates
        let selectedTemplateData;
        const combinedPrompt = `${desiredRooms.toLowerCase()} ${promptText.toLowerCase()}`;

        if (combinedPrompt.includes("stairs") && combinedPrompt.includes("2 bedrooms")) {
            selectedTemplateData = mockFloorPlanTemplates[2];
        } else if (combinedPrompt.includes("stairs")) {
            selectedTemplateData = mockFloorPlanTemplates[2];
        } else if (combinedPrompt.includes("2 bedrooms")) {
            selectedTemplateData = mockFloorPlanTemplates[1];
        } else if (combinedPrompt.includes("1 bedroom")) {
            selectedTemplateData = mockFloorPlanTemplates[0];
        } else {
            selectedTemplateData = mockFloorPlanTemplates[0]; // Fallback
        }
        
        const originalTemplatePlotWidth = selectedTemplateData.plotWidth;
        const originalTemplatePlotHeight = selectedTemplateData.plotHeight;
        const scaleX = plotWidth / originalTemplatePlotWidth;
        const scaleY = plotHeight / originalTemplatePlotHeight;

        const FINAL_EXTERNAL_WALL_THICKNESS_M = 0.20;
        const FINAL_INTERNAL_WALL_THICKNESS_M = 0.15;

        // Scale walls
        const scaledWalls = selectedTemplateData.walls.map(wall => {
            const isHorizontal = wall.width > wall.height;
            const wallLength = (isHorizontal ? wall.width : wall.height) * (isHorizontal ? scaleX : scaleY);
            const wallThickness = (wall.type === "external_wall") ? FINAL_EXTERNAL_WALL_THICKNESS_M : FINAL_INTERNAL_WALL_THICKNESS_M;

            const scaledWallWidth = isHorizontal ? wallLength : wallThickness;
            const scaledWallHeight = isHorizontal ? wallThickness : wallLength;

            return {
                ...wall,
                x: wall.x * scaleX,
                y: wall.y * scaleY,
                width: scaledWallWidth,
                height: scaledWallHeight,
                length: wallLength,
                thickness: wallThickness
            };
        });

        // Scale rooms
        const scaledRooms = selectedTemplateData.rooms.map(room => ({
            ...room,
            x: room.x * scaleX,
            y: room.y * scaleY,
            width: room.width * scaleX,
            height: room.height * scaleY,
            area: (room.width * scaleX) * (room.height * scaleY)
        }));

        // Scale stairs
        const scaledStairs = selectedTemplateData.stairs ? selectedTemplateData.stairs.map(stair => ({
            ...stair,
            x: stair.x * scaleX,
            y: stair.y * scaleY,
            width: stair.width * scaleX,
            height: stair.height * scaleY
        })) : [];

        // Combine all scaled elements
        const aiResponse = {
            walls: scaledWalls,
            rooms: scaledRooms,
            stairs: scaledStairs,
            plotWidth: plotWidth,
            plotHeight: plotHeight
        };
        // --- END MOCK AI LOGIC ---
        
        console.log("MOCKED AI: Matched template:", selectedTemplateData.name, "as response for requested plot:", plotWidth, "x", plotHeight);
        
        res.status(200).json(aiResponse);

    } catch (error) {
        console.error('Error in MOCKED AI generation endpoint:', error);
        res.status(500).json({ message: 'Internal server error in mock AI generation', error: error.message });
    }
});


// --- Serve Frontend Static Files ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.get('/qsc.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'qsc.html'));
});

app.get('/floorplan_designer.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'floorplan_designer.html'));
});

app.use(express.static(path.join(__dirname, '../frontend')));


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the home page at http://localhost:${PORT}`);
    console.log(`Access QSC Calculator at http://localhost:${PORT}/qsc.html`);
    console.log(`Access Floor Plan Designer at http://localhost:${PORT}/floorplan_designer.html`);
});