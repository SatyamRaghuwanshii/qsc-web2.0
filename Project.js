const mongoose = require('mongoose');

const MaterialCalculationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['concrete', 'bricks', 'plaster', 'steel', 'paint', 'flooring'] // Future types
    },
    name: { // e.g., "Ground Floor Slab", "Living Room Wall"
        type: String,
        required: true
    },
    length: Number,
    width: Number,
    height: Number,
    depth: Number, // Alias for height/depth depending on context
    thickness: Number,
    wasteFactor: {
        type: Number,
        default: 5 // Default 5% waste
    },
    concreteMix: String,
    mortarMix: String,
    brickWallLength: Number,
    brickWallHeight: Number,
    brickWallThickness: Number,
    brickSizeLength: Number,
    brickSizeWidth: Number,
    brickSizeHeight: Number,
    mortarJointThickness: Number,

    calculated: { // This object will store the calculated results
        type: mongoose.Schema.Types.Mixed // Use Mixed type for flexible structure (different properties for concrete vs. bricks)
    },

    floor: String, // e.g., "Ground Floor", "First Floor"
    buildingPart: String, // e.g., "Slab", "Column", "Wall"
    notes: String
});


const ProjectSchema = new mongoose.Schema({
    projectName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: 'A new building project.'
    },
    calculations: [MaterialCalculationSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

ProjectSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Project', ProjectSchema);