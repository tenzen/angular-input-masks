var StringMask = (function() {
	var tokens = {
		'0': {pattern: /\d/, default: '0'},
		'9': {pattern: /\d/, optional: true},
		'#': {pattern: /\d/, optional: true, recursive: true},
		'S': {pattern: /[a-zA-Z]/},
		'$': {escape: true} 
	};
	var isEscaped = function(pattern, pos) {
		var count = 0;
		var i = pos - 1;
		var token = {escape: true};
		while (i >= 0 && token && token.escape) {
			token = tokens[pattern.charAt(i)];
			count += token && token.escape ? 1 : 0;
			i--;
		}
		return count > 0 && count%2 === 1;	
	};
	var calcOptionalNumbersToUse = function(pattern, value) {
		var numbersInP = pattern.replace(/[^0]/g,'').length;
		var numbersInV = value.replace(/[^\d]/g,'').length;
		return numbersInV - numbersInP;
	};
	var concatChar = function(text, character, options) {
		if (options.reverse) return character + text;
		return text + character;
	};
	var hasMoreTokens = function(pattern, pos, inc) {
		var pc = pattern.charAt(pos);
		var token = tokens[pc];
		if (pc === '') return false;
		return token && !token.escape ? true : hasMoreTokens(pattern, pos + inc, inc);
	};
	var insertChar = function(text, char, position) {
		var t = text.split('');
		t.splice(position >= 0 ? position: 0, 0, char);
		return t.join('');
	};
	var StringMask = function(pattern, opt) {
		this.options = opt || {};
		this.options = {
			reverse: this.options.reverse || false,
			usedefaults: this.options.usedefaults || this.options.reverse
		};
		this.pattern = pattern;

		StringMask.prototype.process = function proccess(value) {
			if (!value) return '';
			value = value + '';
			var pattern2 = this.pattern;
			var valid = true;
			var formatted = '';
			var valuePos = this.options.reverse ? value.length - 1 : 0;
			var optionalNumbersToUse = calcOptionalNumbersToUse(pattern2, value);
			var escapeNext = false;
			var recursive = [];
			var inRecursiveMode = false;

			var steps = {
				start: this.options.reverse ? pattern2.length - 1 : 0,
				end: this.options.reverse ? -1 : pattern2.length,
				inc: this.options.reverse ? -1 : 1
			};

			var continueCondition = function(options) {
				if (!inRecursiveMode && hasMoreTokens(pattern2, i, steps.inc)) {
					return true;
				} else if (!inRecursiveMode) {
					inRecursiveMode = recursive.length > 0;
				}

				if (inRecursiveMode) {
					var pc = recursive.shift();
					recursive.push(pc);
					if (options.reverse && valuePos >= 0) {
						i++;
						pattern2 = insertChar(pattern2, pc, i);
						return true;
					} else if (!options.reverse && valuePos < value.length) {
						pattern2 = insertChar(pattern2, pc, i);
						return true;
					}
				}
				return i < pattern2.length && i >= 0;
			};

			for (var i = steps.start; continueCondition(this.options); i = i + steps.inc) {
				var pc = pattern2.charAt(i);
				var vc = value.charAt(valuePos);
				var token = tokens[pc];
				if (!inRecursiveMode || vc) {
					if (this.options.reverse && isEscaped(pattern2, i)) {
						formatted = concatChar(formatted, pc, this.options);
						i = i + steps.inc;
						continue;
					} else if (!this.options.reverse && escapeNext) {
						formatted = concatChar(formatted, pc, this.options);
						escapeNext = false;
						continue;
					} else if (!this.options.reverse && token && token.escape) {
						escapeNext = true;
						continue;
					}
				}

				if (!inRecursiveMode && token && token.recursive) {
					recursive.push(pc);
				} else if (inRecursiveMode && !vc) {
					if (!token || !token.recursive) formatted = concatChar(formatted, pc, this.options);
					continue;
				} else if (recursive.length > 0 && token && !token.recursive) {
					// Recursive tokens most be the last tokens of the pattern
					valid = false;
					continue;
				} else if (!inRecursiveMode && recursive.length > 0 && !vc) {
					continue;
				}

				if (!token) {
					formatted = concatChar(formatted, pc, this.options);
					if (!inRecursiveMode && recursive.length) {
						recursive.push(pc);
					}
				} else if (token.optional) {
					if (token.pattern.test(vc) && optionalNumbersToUse) {
						formatted = concatChar(formatted, vc, this.options);
						valuePos = valuePos + steps.inc;
						optionalNumbersToUse--;
					} else if (recursive.length > 0 && vc) {
						valid = false;
						break;
					}
				} else if (token.pattern.test(vc)) {
					formatted = concatChar(formatted, vc, this.options);
					valuePos = valuePos + steps.inc;
				} else if (!vc && token.default && this.options.usedefaults) {
					formatted = concatChar(formatted, token.default, this.options);
				} else {
					valid = false;
					break;
				}
			}

			return {result: formatted, valid: valid};
		};

		StringMask.prototype.apply = function(value) {
			return this.process(value).result;
		};

		StringMask.prototype.validate = function(value) {
			return this.process(value).valid;
		};
	};

	StringMask.process = function(value, pattern, options) {
		return new StringMask(pattern, options).process(value);
	};

	StringMask.apply = function(value, pattern, options) {
		return new StringMask(pattern, options).apply(value);
	};

	StringMask.validate = function(value, pattern, options) {
		return new StringMask(pattern, options).validate(value);
	};

	return StringMask;
}());

/** Used to determine if values are of the language type Object */
var objectTypes = {
	'boolean': false,
	'function': true,
	'object': true,
	'number': false,
	'string': false,
	'undefined': false
};

if (objectTypes[typeof module]) {
	module.exports = StringMask;	
}

(function() {
	'use strict';

	function maxValidator(ctrl, value, limit) {
		var max = parseFloat(limit);
		var validity = ctrl.$isEmpty(value) || isNaN(max)|| value <= max;
		ctrl.$setValidity('max', validity);
		return value;
	}

	function minValidator(ctrl, value, limit) {
		var min = parseFloat(limit);
		var validity = ctrl.$isEmpty(value) || isNaN(min) || value >= min;
		ctrl.$setValidity('min', validity);
		return value;
	}

	var cnpjPattern = new StringMask('00.000.000\/0000-00');
	function validateCNPJ(c) {
		var b = [6,5,4,3,2,9,8,7,6,5,4,3,2];
		c = c.replace(/[^\d]/g,'').split('');
		if(c.length !== 14) {
			return false;
		}

		for (var i = 0, n = 0; i < 12; i++) {
			n += c[i] * b[i+1];
		}
		n = 11 - n%11;
		n = n >= 10 ? 0 : n;
		if (parseInt(c[12]) !== n)  {
			return false;
		}

		for (i = 0, n = 0; i <= 12; i++) {
			n += c[i] * b[i];
		}
		n = 11 - n%11;
		n = n >= 10 ? 0 : n;
		if (parseInt(c[13]) !== n)  {
			return false;
		}
		return true;
	}

	var cpfPattern = new StringMask('000.000.000-00');
	function validateCPF(cpf) {
		cpf = cpf.replace(/[^\d]+/g,'');
		if (cpf === '' || cpf === '00000000000' || cpf.length !== 11) {
			return false;
		}
		function validateDigit(digit) {
			var add = 0;
			var init = digit - 9;
			for (var i = 0; i < 9; i ++) {
				add += parseInt(cpf.charAt(i + init)) * (i+1);
			}
			return (add%11)%10 === parseInt(cpf.charAt(digit));
		}
		return validateDigit(9) && validateDigit(10);
	}

	function numberViewMask (decimals, decimalDelimiter, thousandsDelimiter) {
		var mask = '#' + thousandsDelimiter + '##0';

		if(decimals > 0) {
			mask += decimalDelimiter;
			for (var i = 0; i < decimals; i++) {
				mask += '0';
			}
		}

		return new StringMask(mask, {
			reverse:true
		});
	}

	function numberModelMask (decimals) {
		var mask = '###0';

		if(decimals > 0) {
			mask += '.';
			for (var i = 0; i < decimals; i++) {
				mask += '0';
			}
		}

		return new StringMask(mask, {
			reverse:true
		});
	}

	function clearDelimitersAndLeadingZeros (value) {
		var cleanValue = value.replace(/^0*/, '');
		cleanValue = cleanValue.replace(/[^0-9]/g, '');
		return cleanValue;
	}

	function preparePercentageToFormatter (value, decimals) {
		return clearDelimitersAndLeadingZeros((parseFloat(value)*100).toFixed(decimals));
	}

	function prepareNumberToFormatter (value, decimals) {
		return clearDelimitersAndLeadingZeros((parseFloat(value)).toFixed(decimals));
	}

	var cepPattern = new StringMask('00000-000');
	function validateCEP (cep) {
		return cep.length === 8;
	}

	var btDatePattern = new StringMask('00/00/0000');
	function validateBrDate (originalValue, isoDate) {
		originalValue = originalValue+"";
		if(originalValue.length != 8) return false;

		return true ; //moment(isoDate).isValid(); // XXX let the validator validate
	}

	angular.module('ui.utils.masks', [])
	.directive('uiPercentageMask', ['$locale', function ($locale) {
		var decimalDelimiter = $locale.NUMBER_FORMATS.DECIMAL_SEP,
			thousandsDelimiter = $locale.NUMBER_FORMATS.GROUP_SEP;

		return {
			restrict: 'A',
			require: '?ngModel',
			scope: {
				min: '=?min',
				max: '=?max'
			},
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				var decimals = parseInt(attrs.uiPercentageMask);
				if(isNaN(decimals)) {
					decimals = 2;
				}
				var numberDecimals = decimals + 2;
				var viewMask = numberViewMask(decimals, decimalDelimiter, thousandsDelimiter),
					modelMask = numberModelMask(numberDecimals);

				ctrl.$formatters.push(function(value) {
					if(!value) {
						return ' %';
					}

					var valueToFormat = preparePercentageToFormatter(value, decimals);
					return viewMask.apply(valueToFormat) + ' %';
				});

				ctrl.$parsers.push(function(value) {
					function renderValue(formatedValue) {
						if (ctrl.$viewValue !== formatedValue) {
							ctrl.$setViewValue(formatedValue);
							ctrl.$render();
						}
					}
					if(!value) {
						renderValue(' %');
						return value;
					}

					var valueToFormat = clearDelimitersAndLeadingZeros(value);
					if(value && value.indexOf('%') < 0 && valueToFormat.length >= 1) {
						valueToFormat = valueToFormat.substr(0,valueToFormat.length-1);
					}
					var formatedValue = ' %';
					var actualNumber;
					if (valueToFormat) {
						formatedValue = viewMask.apply(valueToFormat) + ' %';
						actualNumber = parseFloat(modelMask.apply(valueToFormat));
					}
					renderValue(formatedValue);

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return actualNumber;
				});

				if(attrs.min){
					ctrl.$parsers.push(function(value) {
						return minValidator(ctrl, value, scope.min);
					});

					scope.$watch('min', function() {
						minValidator(ctrl, ctrl.$modelValue, scope.min);
					});
				}

				if(attrs.max) {
					ctrl.$parsers.push(function(value) {
						return maxValidator(ctrl, value, scope.max);
					});

					scope.$watch('max', function() {
						maxValidator(ctrl, ctrl.$modelValue, scope.max);
					});
				}
			}
		};
	}])
	.directive('uiNumberMask', ['$locale', function ($locale) {
		var decimalDelimiter = $locale.NUMBER_FORMATS.DECIMAL_SEP,
			thousandsDelimiter = $locale.NUMBER_FORMATS.GROUP_SEP;

		return {
			restrict: 'A',
			require: '?ngModel',
			scope: {
				min: '=?min',
				max: '=?max'
			},
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				var decimals = parseInt(attrs.uiNumberMask);
				if(isNaN(decimals)) {
					decimals = 2;
				}
				var viewMask = numberViewMask(decimals, decimalDelimiter, thousandsDelimiter),
					modelMask = numberModelMask(decimals);

				ctrl.$formatters.push(function(value) {
					if(!value) {
						return value;
					}

					var valueToFormat = prepareNumberToFormatter(value, decimals);
					return viewMask.apply(valueToFormat);
				});

				ctrl.$parsers.push(function(value) {
					if(!value) {
						return value;
					}

					var valueToFormat = clearDelimitersAndLeadingZeros(value);
					var formatedValue = viewMask.apply(valueToFormat);
					var actualNumber = parseFloat(modelMask.apply(valueToFormat));

					if(angular.isDefined(attrs.uiNegativeNumber)){
						var isNegative = (value[0] === '-'),
							needsToInvertSign = (value.slice(-1) === '-');

						//only apply the minus sign if is negative or(exclusive) needs to be negative
						if(needsToInvertSign ^ isNegative) {
							actualNumber *= -1;
							formatedValue = '-' + formatedValue;
						}
					}

					if (ctrl.$viewValue !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
					}

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return actualNumber;
				});

				if(attrs.min){
					ctrl.$parsers.push(function(value) {
						return minValidator(ctrl, value, scope.min);
					});

					scope.$watch('min', function() {
						minValidator(ctrl, ctrl.$modelValue, scope.min);
					});
				}

				if(attrs.max) {
					ctrl.$parsers.push(function(value) {
						return maxValidator(ctrl, value, scope.max);
					});

					scope.$watch('max', function() {
						maxValidator(ctrl, ctrl.$modelValue, scope.max);
					});
				}
			}
		};
	}])
	.directive('uiBrCpfMask', [function () {
		function applyCpfMask (value) {
			if(!value) {
				return value;
			}
			var formatedValue = cpfPattern.apply(value);
			return formatedValue.trim().replace(/[^0-9]$/, '');
		}

		return {
			restrict: 'A',
			require: '?ngModel',
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				ctrl.$formatters.push(function(value) {
					return applyCpfMask(value);
				});

				ctrl.$parsers.push(function(value) {
					if(!value) {
						return value;
					}

					var actualNumber = value.replace(/[^\d]/g,'');
					var formatedValue = applyCpfMask(actualNumber);
					ctrl.$setValidity('cpf', validateCPF(formatedValue));

					if (ctrl.$viewValue !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
					}

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return formatedValue.replace(/[^\d]+/g,'');
				});
			}
		};
	}])
	.directive('uiBrCnpjMask', [function () {
		function applyCnpjMask (value) {
			if(!value) {
				return value;
			}
			var formatedValue = cnpjPattern.apply(value);
			return formatedValue.trim().replace(/[^0-9]$/, '');
		}
		return {
			restrict: 'A',
			require: '?ngModel',
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				ctrl.$formatters.push(function(value) {
					return applyCnpjMask(value);
				});

				ctrl.$parsers.push(function(value) {
					if(!value) {
						return value;
					}

					var actualNumber = value.replace(/[^\d]+/g,'');
					var formatedValue = applyCnpjMask(actualNumber);
					ctrl.$setValidity('cnpj', validateCNPJ(formatedValue));

					if (ctrl.$viewValue !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
					}

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return formatedValue.replace(/[^\d]+/g,'');
				});
			}
		};
	}])
	.directive('uiBrCpfcnpjMask', [function () {
		function applyCpfCnpjMask (value) {
			if(!value) {
				return value;
			}
			var formatedValue;
			if (value.length > 11) {
				formatedValue = cnpjPattern.apply(value);
			} else {
				formatedValue = cpfPattern.apply(value);
			}
			return formatedValue.trim().replace(/[^0-9]$/, '');
		}
		return {
			restrict: 'A',
			require: '?ngModel',
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				ctrl.$formatters.push(function(value) {
					return applyCpfCnpjMask(value);
				});

				ctrl.$parsers.push(function(value) {
					if(!value) {
						return value;
					}
					var actualNumber = value.replace(/[^\d]+/g,'');

					var formatedValue = applyCpfCnpjMask(actualNumber);
					if (actualNumber.length > 11) {
						ctrl.$setValidity('cnpj', validateCNPJ(formatedValue));
						ctrl.$setValidity('cpf', true);
					} else {
						ctrl.$setValidity('cpf', validateCPF(formatedValue));
						ctrl.$setValidity('cnpj', true);
					}

					if (ctrl.$viewValue !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
					}

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return formatedValue.replace(/[^\d]+/g,'');
				});
			}
		};
	}])
	.directive('uiMoneyMask', ['$locale', function ($locale) {
		var decimalDelimiter = $locale.NUMBER_FORMATS.DECIMAL_SEP;
		var thousandsDelimiter = $locale.NUMBER_FORMATS.GROUP_SEP;
		var currencySym = $locale.NUMBER_FORMATS.CURRENCY_SYM;
		return {
			restrict: 'A',
			require: '?ngModel',
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				var decimals = parseInt(attrs.uiMoneyMask);
				if(isNaN(decimals)) {
					decimals = 2;
				}
				var decimalsPattern = decimals > 0 ? decimalDelimiter + new Array(decimals + 1).join('0') : '';
				var includeCurrencySym = (attrs.includeCurrencySym == undefined) || (attrs.includeCurrencySym === "true");
				var mask = '';
				if(includeCurrencySym) {
					mask += currencySym;
				}
				mask += ' #'+thousandsDelimiter+'##0'+decimalsPattern;
				var moneyMask = new StringMask(mask, {reverse: true});
				ctrl.$formatters.push(function(value) {
					if(!value) {
						return value;
					}

					return moneyMask.apply(parseFloat(value).toFixed(decimals).replace(/[^\d]+/g,''));
				});

				ctrl.$parsers.push(function(value) {
					if (!value) {
						return value;
					}

					var actualNumber = value.replace(/[^\d]+/g,'');
					actualNumber = actualNumber.replace(/^[0]+([1-9])/,'$1');
					var formatedValue = moneyMask.apply(actualNumber);

					if (value !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
					}

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return parseInt(formatedValue.replace(/[^\d]+/g,''))/Math.pow(10,decimals);
				});
			}
		};
	}])
	.directive('uiBrPhoneNumber',function() {
		/**
		 * FIXME: all numbers will have 9 digits after 2016.
		 * see http://portal.embratel.com.br/embratel/9-digito/
		 */
		var phoneMask8D = new StringMask('(00) 0000-0000'),
			phoneMask9D = new StringMask('(00) 00000-0000');

		function clearValue (value) {
			if(!value) {
				return value;
			}

			return value.replace(/[^0-9]/g, '');
		}

		function removeLastNonDigitChar (value) {
			if(!value) {
				return value;
			}

			return value.trim().replace(/[^0-9]$/, '');
		}

		function applyPhoneMask (value) {
			if(!value) {
				return value;
			}

			var formatedValue;
			if(value.length < 11){
				formatedValue = phoneMask8D.apply(value);
			}else{
				formatedValue = phoneMask9D.apply(value);
			}

			return formatedValue.trim().replace(/[^0-9]$/, '');
		}

		return {
			restrict: 'A',
			require: '?ngModel',
			link: function(scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				ctrl.$formatters.push(function(value) {
					return applyPhoneMask(value);
				});

				ctrl.$parsers.push(function(value) {
					if (!value) {
						return value;
					}

					var cleanValue = clearValue(value);
					var formatedValue = applyPhoneMask(cleanValue);

					if (ctrl.$viewValue !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
					}

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return clearValue(formatedValue);
				});
			}
		}
	})
	.directive('uiBrDateMask', [function () {
		function applyBrDateMask (value) {
			if(!value) {
				return value;
			}
			var formatedValue = btDatePattern.apply(value);
			return formatedValue.trim().replace(/[^0-9]$/, '');
		}

		return {
			restrict: 'A',
			require: '?ngModel',
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				ctrl.$formatters.push(function(value) {
					var brDateRawNumbers = value && value.replace(
						/^(\d)(\d)(\d)(\d)-(\d)(\d)-(\d)(\d)/,
						"$7$8$5$6$1$2$3$4"
					);
					return applyBrDateMask(brDateRawNumbers);
				});

				ctrl.$parsers.push(function(value) {
					if(!value) {
						return value;
					}

					var actualNumber = value.replace(/[^\d]/g,'');
					var formatedValue = applyBrDateMask(actualNumber);
					var isoDate = formatedValue.split("/").reverse().join("-")+"T00:00:00Z";
					var valid = validateBrDate(actualNumber, isoDate);

					ctrl.$setValidity('brDateMask', valid);

					if (ctrl.$viewValue !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
						window.setTimeout(function() {
							element.val(formatedValue);
						});
					}

					return valid ? isoDate : ctrl.$modelValue;
				});
			}
		};
	}])
	.directive('uiCepMask', [function () {
		function applyCepMask (value) {
			if(!value) {
				return value;
			}
			var formatedValue = cepPattern.apply(value);
			return formatedValue.trim().replace(/[^0-9]$/, '');
		}

		return {
			restrict: 'A',
			require: '?ngModel',
			link: function (scope, element, attrs, ctrl) {
				if (!ctrl) {
					return;
				}

				ctrl.$formatters.push(function(value) {
					if(!value) {
						return value;
					}
					value = value.replace(/[^\d]/g,'');
					return applyCepMask(value);
				});

				ctrl.$parsers.push(function(value) {
					if(!value) {
						return value;
					}

					var actualNumber = value.replace(/[^\d]/g,'');
					var formatedValue = applyCepMask(actualNumber);

					ctrl.$setValidity('cep', validateCEP(actualNumber));

					if (ctrl.$viewValue !== formatedValue) {
						ctrl.$setViewValue(formatedValue);
						ctrl.$render();
					}

					window.setTimeout(function() {
						element.val(formatedValue);
					});

					return actualNumber;
				});
			}
		};
	}])
})();
