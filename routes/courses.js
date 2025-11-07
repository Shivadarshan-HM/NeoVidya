const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Course syllabus data (same as in frontend)
const syllabus = [
  {
    key: 'math',
    title: 'Mathematics',
    icon: '➗',
    ic: 'ic-math',
    color: '#FFD46A',
    chapters: [
      {
        title: 'Fractions',
        badges: ['Core', 'Visual'],
        items: [
          { type: 'Lecture', text: 'Fractions – Visual Models' },
          { type: 'Lecture', text: 'Add & Subtract Fractions' },
          { type: 'Quiz', text: 'Fractions Fundamentals (+60 XP)' },
        ]
      },
      {
        title: 'Algebra Basics',
        badges: ['Variables'],
        items: [
          { type: 'Lecture', text: 'Intro to Variables & Expressions' },
          { type: 'Quiz', text: 'Intro to Algebra (+50 XP)' },
        ]
      },
      {
        title: 'Geometry',
        badges: ['Shapes'],
        items: [
          { type: 'Lecture', text: 'Basics of Angles & Triangles' },
        ]
      },
    ]
  },
  {
    key: 'science',
    title: 'Science',
    icon: '🧪',
    ic: 'ic-sci',
    color: '#8ef0b4',
    chapters: [
      {
        title: 'Living Things',
        badges: ['Bio'],
        items: [
          { type: 'Lecture', text: 'Cells & Tissues' },
          { type: 'Quiz', text: 'Life Basics (+50 XP)' }
        ]
      },
      {
        title: 'Matter',
        badges: ['Chem'],
        items: [
          { type: 'Lecture', text: 'States of Matter' },
          { type: 'Lecture', text: 'Mixtures & Solutions' }
        ]
      },
      {
        title: 'Energy',
        badges: ['Phys'],
        items: [
          { type: 'Lecture', text: 'Forms of Energy' },
          { type: 'Quiz', text: 'Energy Quiz (+40 XP)' }
        ]
      },
    ]
  },
  {
    key: 'social',
    title: 'Social Science',
    icon: '🌍',
    ic: 'ic-ss',
    color: '#ffd7a1',
    chapters: [
      {
        title: 'Geography',
        badges: ['Maps'],
        items: [
          { type: 'Lecture', text: 'Reading Maps & Directions' }
        ]
      },
      {
        title: 'History',
        badges: ['Past'],
        items: [
          { type: 'Lecture', text: 'Ancient Civilizations' },
          { type: 'Quiz', text: 'Heritage Quiz (+40 XP)' }
        ]
      },
      {
        title: 'Civics',
        badges: ['Rights'],
        items: [
          { type: 'Lecture', text: 'Community & Rules' }
        ]
      },
    ]
  },
  {
    key: 'english',
    title: 'English',
    icon: '📚',
    ic: 'ic-eng',
    color: '#a8a0ff',
    chapters: [
      {
        title: 'Reading',
        badges: ['Comprehension'],
        items: [
          { type: 'Lecture', text: 'Unseen Passage Strategies' },
          { type: 'Quiz', text: 'Vocabulary Mix (+40 XP)' }
        ]
      },
      {
        title: 'Grammar',
        badges: ['Tenses'],
        items: [
          { type: 'Lecture', text: 'Present & Past Tenses' },
          { type: 'Lecture', text: 'Articles & Prepositions' }
        ]
      },
      {
        title: 'Writing',
        badges: ['Creative'],
        items: [
          { type: 'Lecture', text: 'Paragraph Writing' }
        ]
      },
    ]
  },
  {
    key: 'computer',
    title: 'Computer Basics',
    icon: '💻',
    ic: 'ic-cs',
    color: '#7bd0ff',
    chapters: [
      {
        title: 'Know the Computer',
        badges: ['CPU', 'I/O'],
        items: [
          { type: 'Lecture', text: 'Hardware & Software' },
          { type: 'Quiz', text: 'Know Your Computer (+60 XP)' }
        ]
      },
      {
        title: 'Internet & Safety',
        badges: ['Web'],
        items: [
          { type: 'Lecture', text: 'Internet Basics' },
          { type: 'Quiz', text: 'Online Safety (+50 XP)' }
        ]
      },
      {
        title: 'Shortcuts',
        badges: ['Keys'],
        items: [
          { type: 'Lecture', text: 'Keyboard Shortcuts 101' }
        ]
      },
    ]
  },
  {
    key: 'art',
    title: 'Art',
    icon: '🎨',
    ic: 'ic-art',
    color: '#ff8db6',
    chapters: [
      {
        title: 'Elements of Art',
        badges: ['Line', 'Color'],
        items: [
          { type: 'Lecture', text: 'Color Wheel & Harmony' }
        ]
      },
      {
        title: 'Drawing',
        badges: ['Practice'],
        items: [
          { type: 'Lecture', text: 'Basic Shapes to Objects' },
          { type: 'Quiz', text: 'Art Basics (+40 XP)' }
        ]
      },
    ]
  },
  {
    key: 'pe',
    title: 'Physical Education',
    icon: '🏃',
    ic: 'ic-pe',
    color: '#a9ff8e',
    chapters: [
      {
        title: 'Warm-up & Stretch',
        badges: ['Flexibility'],
        items: [
          { type: 'Lecture', text: 'Dynamic vs Static' }
        ]
      },
      {
        title: 'Fitness',
        badges: ['Health'],
        items: [
          { type: 'Lecture', text: 'Endurance & Strength' },
          { type: 'Quiz', text: 'Fitness Fundamentals (+60 XP)' }
        ]
      },
    ]
  },
  {
    key: 'hindi',
    title: 'Hindi',
    icon: '🅷',
    ic: 'ic-hi',
    color: '#ffc48e',
    chapters: [
      {
        title: 'पठन',
        badges: ['Comprehension'],
        items: [
          { type: 'Lecture', text: 'अपठित गद्यांश' }
        ]
      },
      {
        title: 'व्याकरण',
        badges: ['संज्ञा', 'काल'],
        items: [
          { type: 'Lecture', text: 'संज्ञा व सर्वनाम' },
          { type: 'Quiz', text: 'व्याकरण मूलाधार (+50 XP)' }
        ]
      },
      {
        title: 'लेखन',
        badges: ['রচনात्मक'],
        items: [
          { type: 'Lecture', text: 'चित्र आधारित अनुच्छेद' }
        ]
      },
    ]
  },
];

// Get all courses
router.get('/', (req, res) => {
  res.json({ courses: syllabus });
});

// Get specific course by key
router.get('/:key', (req, res) => {
  const course = syllabus.find(c => c.key === req.params.key);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  res.json({ course });
});

// Get course progress for authenticated user
router.get('/:key/progress', (req, res) => {
  // This would require authentication middleware
  // For now, return empty progress
  res.json({ progress: [] });
});

module.exports = router;
