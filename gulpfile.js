const gulp = require('gulp');
const comments = require('gulp-comments');
const ghpages = require('gh-pages');

gulp.task('comments', function()
{
    return gulp.src('src/**/*.{ts,js}')
        .pipe(comments())
        .pipe(gulp.dest('.docs'));
});

gulp.task('deploy', function(done)
{
    const options = {
        src: [
            'dist/**',
            'examples/**',
            'docs/**'
        ]
    };
    ghpages.publish(__dirname, options, done);
});