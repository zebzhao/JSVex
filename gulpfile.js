var jsonminify = require('gulp-jsonminify');
var gulp = require('gulp');

gulp.task('minify', function () {
    return gulp.src(['dist/*.json', '!dist/index.json'])
        .pipe(jsonminify())
        .pipe(gulp.dest('dist'));
});