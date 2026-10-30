const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getStudentSubjectDetails,
  markTopicReviewed,
  submitTopicQuiz,
  streamStudentPresentation,
} = require('../controllers/student');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.use(isAuthenticatedUser);

router.get('/student/dashboard', getStudentDashboard);
router.get('/student/subjects/:subjectId', getStudentSubjectDetails);
router.get('/student/presentation/stream', streamStudentPresentation);
router.post('/student/topics/mark-reviewed', markTopicReviewed);
router.post('/student/topics/quiz/submit', submitTopicQuiz);

module.exports = router;
