/**
 * GATE 2027 Dashboard Progress Calculations
 * Aggregates individual subject metrics into overall analytics
 */

window.GateProgress = {
    /**
     * Calculates the overall dashboard metrics based on subject definitions
     * and their stored state.
     * @param {Array<Object>} subjects - The list of subjects from subjects.json
     * @returns {Object} Overall progress report
     */
    calculateOverall(subjects) {
        if (!subjects || subjects.length === 0) {
            return {
                overallPercentage: 0,
                completedSubjects: 0,
                remainingSubjects: 0,
                totalSubjects: 0,
                totalTasks: 0,
                completedTasks: 0,
                remainingTasks: 0
            };
        }

        let totalTasks = 0;
        let completedTasks = 0;
        let completedSubjects = 0;

        subjects.forEach(subject => {
            const progress = window.GateStorage.getSubjectProgress(subject.id, subject.totalTasks);
            
            totalTasks += progress.totalTasks;
            completedTasks += progress.completedTasks;
            
            // A subject is completed if progress is 100%
            if (progress.percentage >= 100) {
                completedSubjects++;
            }
        });

        const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const remainingSubjects = subjects.length - completedSubjects;
        const remainingTasks = totalTasks - completedTasks;

        return {
            overallPercentage,
            completedSubjects,
            remainingSubjects,
            totalSubjects: subjects.length,
            totalTasks,
            completedTasks,
            remainingTasks
        };
    }
};
