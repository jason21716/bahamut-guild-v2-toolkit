export default `/* The switch - the box around the slider */
.switch {
	position: relative;
	display: inline-block;
	width: 30px;
	height: 17px;
}

/* Hide default HTML checkbox */
.switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

/* The slider */
.slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #ccc;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

.slider:before {
	position: absolute;
	content: '';
	height: 13px;
	width: 13px;
	left: 2px;
	bottom: 2px;
	background-color: white;
}

input:checked + .slider {
	background-color: #2196f3;
}

input:focus + .slider {
	box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
	-webkit-transform: translateX(13px);
	-ms-transform: translateX(13px);
	transform: translateX(13px);
}

/* Rounded sliders */
.slider.round {
	border-radius: 17px;
}

.slider.round:before {
	border-radius: 50%;
}

.text_content-hide {
	display: block !important;
}

.more-text {
	display: none;
}

div[data-google-query-id] {
	display: none;
}

.bhgv2-editor-textarea-wrapper {
	position: relative;
}

.bhgv2-editor-textarea {
	font-family: -apple-system, "San Francisco", Roboto, "Segoe UI", Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Helvetica Neue", Helvetica, Roboto, Arial, "Lucida Grande", "PingFang TC", "蘋果儷中黑", "Apple LiGothic Medium", sans-serif;
}

.bhgv2-editor-textarea-carbon {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;

	color: transparent;
	font-size: 15px;
	line-height: 1.5;
	pointer-events: none;
}

.bhgv2-editor-textarea-carbon-trailing {
	padding-left: 3px;
	color: #aaa;
}

.bhgv2-editor-textarea-carbon-trailing code {
	font-size: 12px;
	padding: 2px 4px;
	background: #ddd;
	border-radius: 2px;
}

.bhgv2-comment-list-outer > div.bhgv2-editor-container .bhgv2-editor-container-footer {
	display: flex;
	flex-direction: row;
	padding: 13px 0 5px;
	font-size: 12px;
}

.bhgv2-editor-container-reply-content-footer {
	font-size: 12px;
	color: #777;
	padding: 2px 8px;
}

.bhgv2-editor-container-footer .bhgv2-config-status {
	flex: 1;
}

.bhgv2-config-panel {
	background: #ffffff;
	padding: 8px;
	border-radius: 4px;
	display: none;
}

.bhgv2-config-panel.active {
	display: block;
}

.bhgv2-config-panel.bhgv2-config-panel.bhgv2-config-panel input {
	border: 1px solid #999;
}

.bhgv2-config-panel.bhgv2-config-panel.bhgv2-config-panel button {
	display: inline-block;
	-webkit-border-radius: 5px;
	-moz-border-radius: 5px;
	border-radius: 5px;
	background-color: #eee;
	padding: 3px;
	margin-left: 2px;
	margin-right: 2px;
	border: 1px solid #333;
	color: #000;
	text-decoration: none;
}

.bhgv2-config-panel.bhgv2-config-panel.bhgv2-config-panel button:disabled {
	color: #ccc;
}

.bhgv2-config-form-message {
	text-align: center;
	color: #4a934a;
	font-size: 12px;
	min-height: 24px;
	line-height: 16px;
	padding: 4px;
	margin-top: 0.5rem;
}

.bhgv2-config-form-footer {
	text-align: center;
	margin-top: 0.5rem;
}

.bhgv2-config-form-footer > * + * {
	margin-left: 1rem;
}

.bhgv2-config-form-content .bhgv2-config-form-row {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	margin-bottom: 2px;
}

.bhgv2-config-form-content .bhgv2-config-form-col {
	display: flex;
	align-items: center;
	justify-content: flex-start;
}

.bhgv2-config-form-content .bhgv2-config-form-col > * {
	display: inline-block;
	margin-right: 2px;
}

.bhgv2-config-form-content .bhgv2-config-form-col input[type=text],
.bhgv2-config-form-content .bhgv2-config-form-col input[type=number] {
	width: 3rem;
}

.bhgv2-config-form-content .bhgv2-config-form-col + .bhgv2-config-form-col {
	margin-left: 0.5rem;
}

.bhgv2-config-form-actions {
	display: flex;
	justify-content: flex-start;
	flex-wrap: wrap;
	font-size: 12px;
	padding-top: 5px;
	margin-top: 5px;
	border-top: 1px dashed #999;
}

.bhgv2-config-form-actions > * + * {
	margin-left: 1rem;
}

.bhgv2-comment-list {
	min-height: calc(100vh - 300px);
}
`
