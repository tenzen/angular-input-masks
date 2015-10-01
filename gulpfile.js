var gulp = require('gulp'),
	concat = require('gulp-concat'),
	rename = require('gulp-rename'),
	uglify = require('gulp-uglify');

gulp.task('lib', function() {
	gulp.src(['string-mask/src/string-mask.js'], {
		cwd: 'bower_components/'
	})
	.pipe(gulp.dest('lib'));
});

gulp.task('dist', function(){
	console.log("dist");
	gulp.src(['lib/string-mask.js', 'src/masks.js'])
		.pipe(concat('concat.js'))
		.pipe(rename('angular-input-masks.js'))
		.pipe(gulp.dest('dist'))
});


gulp.task('build', ['lib','dist']);

gulp.task('default', ['build']);
