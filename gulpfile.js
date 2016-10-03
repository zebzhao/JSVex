var jsonminify = require('gulp-jsonminify');
var gulp = require('gulp');

gulp.task('minify', function () {
    return gulp.src(['output/*.json', '!output/index.json'])
        .pipe(jsonminify())
        .pipe(gulp.dest('dist'));
});