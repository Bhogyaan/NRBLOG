import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  media: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true,
  },
  caption: {
    type: String,
    default: '',
    maxlength: 500,
  },
  duration: {
    type: Number,
    default: 0,
  },
  previewUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h', // Stories expire after 24 hours
  },
});

const Story = mongoose.model('Story', storySchema);

export default Story;