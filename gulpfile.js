const gulp = require('gulp');
const comments = require('gulp-comments');

gulp.task('comments', function()
{
    return gulp.src('src/**/*.{ts,js}')
        .pipe(comments())
        .pipe(gulp.dest('.docs'));
});