// ../../supabase/functions/chart-assistant/chatContract.ts
var messages = {
	ANSWERED: "The available evidence supports the following.",
	INSUFFICIENT_EVIDENCE: "I found insufficient evidence in CombusLab to answer this question confidently.",
	OUT_OF_SCOPE: "This question is outside my scope. Ask about the combustion research, experiments, datasets, charts or fire-safety evidence in CombusLab.",
	ERROR: "I could not process your question. Please try again."
};
function hasSafeSource(value) {
	if (typeof value !== "string") return false;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && [
			"psi.nasa.gov",
			"science.nasa.gov",
			"ntrs.nasa.gov",
			"www.nasa.gov"
		].includes(url.hostname) && !url.username && !url.password;
	} catch {
		return false;
	}
}
// ../../supabase/functions/_shared/scenarios.ts
var scenarios = {
	spacecraft: {
		gravity: "microgravity",
		oxygen: "",
		pressure: "",
		airflow: "",
		material: "",
		objective: "spread"
	},
	lunar: {
		gravity: "lunar",
		oxygen: "32",
		pressure: "10.2",
		airflow: "",
		material: "",
		objective: "materials"
	},
	martian: {
		gravity: "martian",
		oxygen: "",
		pressure: "",
		airflow: "",
		material: "",
		objective: "extinction"
	}
};
// ../../supabase/functions/_shared/nasaResearch.ts
var psi = (id) => `https://psi.nasa.gov/physci/repo/data/investigations/PSI-${id}`;
var nasaResearch = [
	{
		title: "SAFFIRE",
		topic: "Flame spread",
		summary: "Large-scale tests in Cygnus examined how flames spread over spacecraft materials under forced airflow.",
		links: [
			{
				label: "SAFFIRE-I · PSI-98",
				url: psi(98)
			},
			{
				label: "SAFFIRE-II · PSI-99",
				url: psi(99)
			},
			{
				label: "SAFFIRE-III · PSI-100",
				url: psi(100)
			}
		],
		app: {
			label: "Open the ventilation case",
			path: "/flight-notebook"
		},
		coverage: "Trial records and synchronized gas readings in CombusLab"
	},
	{
		title: "BASS and BASS-II",
		topic: "Solid fuels and suppression",
		summary: "Small-scale ISS tests studied how solid samples ignite, burn, and go out under different flow conditions.",
		links: [{
			label: "BASS · PSI-26",
			url: psi(26)
		}, {
			label: "BASS-II · PSI-25",
			url: psi(25)
		}],
		app: {
			label: "Explore BASS-II trials",
			path: "/discover?investigation_id=PSI-25"
		},
		coverage: "Trial records and reported conditions in CombusLab"
	},
	{
		title: "FLEX and FLEX-2",
		topic: "Liquid fuel and extinction",
		summary: "Liquid fuel droplet experiments provide evidence about burning and extinction in microgravity. FLEX also studied how surrounding gases affect extinction.",
		links: [{
			label: "FLEX · PSI-69",
			url: psi(69)
		}, {
			label: "FLEX-2 · PSI-68",
			url: psi(68)
		}],
		coverage: "External datasets on NASA PSI"
	},
	{
		title: "SPICE",
		topic: "Soot and airflow",
		summary: "Controlled gas flames probe how fuel, burner geometry, and coflow affect the onset of visible soot emission.",
		links: [{
			label: "SPICE · PSI-107",
			url: psi(107)
		}],
		coverage: "External dataset on NASA PSI"
	},
	{
		title: "ACME",
		topic: "Gas flames and soot",
		summary: "ISS investigations use gaseous flames to study soot formation, flame stability, and combustion under controlled conditions.",
		links: [
			{
				label: "CLD Flame · PSI-21",
				url: psi(21)
			},
			{
				label: "Burning Rate Emulator · PSI-20",
				url: psi(20)
			},
			{
				label: "E-FIELD Flames · PSI-22",
				url: psi(22)
			},
			{
				label: "s-Flame · PSI-23",
				url: psi(23)
			},
			{
				label: "Flame Design · PSI-10",
				url: psi(10)
			},
			{
				label: "NASA ACME overview",
				url: "https://science.nasa.gov/mission/acme/"
			}
		],
		app: {
			label: "Explore CLD Flame test days",
			path: "/discover?investigation_id=PSI-21"
		},
		coverage: "CLD Flame test-day counts in CombusLab. Other datasets on NASA PSI."
	},
	{
		title: "SAME and SAME-R",
		topic: "Smoke and detection",
		summary: "Smoke particle experiments provide evidence for evaluating spacecraft smoke detection.",
		links: [{
			label: "SAME · PSI-102",
			url: psi(102)
		}, {
			label: "SAME-R · PSI-101",
			url: psi(101)
		}],
		coverage: "External datasets on NASA PSI"
	},
	{
		title: "SoFIE",
		topic: "Ignition and flammability",
		summary: "ISS solid-fuel experiments study ignition, growth, and extinction under controlled spacecraft atmosphere conditions.",
		links: [
			{
				label: "NASA SoFIE overview",
				url: "https://science.nasa.gov/biological-physical/investigations/sofie/"
			},
			{
				label: "Growth and Extinction Limit",
				url: "https://science.nasa.gov/biological-physical/investigations/sofie-gel/"
			},
			{
				label: "Material Ignition and Suppression Test",
				url: "https://science.nasa.gov/biological-physical/investigations/sofie-mist-solid-fuel-ignition-and-extinction-material-ignition-and-suppression-test/"
			}
		],
		coverage: "NASA investigation documentation"
	}
];
// ../../supabase/functions/_shared/flightNotebook.ts
var notebookSources = [
	{
		label: "NASA flight images · slide 17",
		url: "https://ntrs.nasa.gov/api/citations/20180004258/downloads/20180004258.pdf#page=17"
	},
	{
		label: "Published test conditions · Table 2",
		url: "https://ntrs.nasa.gov/api/citations/20210011521/downloads/ICES%202021-266%200503-2021%20final.pdf"
	},
	{
		label: "SAFFIRE-I · NASA PSI",
		url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-98"
	},
	{
		label: "SAFFIRE-III · NASA PSI",
		url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-100"
	}
];
var observation = "Both tests burned SIBAL fabric with the flame moving in the direction of the airflow. NASA reports faster spread in the 25 cm/s SAFFIRE-III test than in the 20 cm/s SAFFIRE-I test.";
var clockNote = "NASA spaced the flame images 40 seconds apart. The gas charts start at the first calibrated reading for each trial. Alignment between the images and gas readings has not been verified.";
var airflowNote = "The integrated trial record lists 30 cm/s for SAFFIRE-III. The published figure and Table 2 give 25 cm/s for this concurrent-flow test, which is the value used in this case.";
// ../../supabase/functions/_shared/scientificEvidence.ts
var objectives = {
	spread: "Flame growth and spread",
	ignition: "Ignition",
	extinction: "Extinction and suppression",
	materials: "Material flammability",
	soot: "Soot formation"
};
var saffireReference = "https://ntrs.nasa.gov/citations/20170000230";
var saffireHardware = "SAFFIRE enclosure on an uncrewed Cygnus cargo vehicle";
var bassHardware = "Small test section in the ISS Microgravity Science Glovebox";
var researchContext = {
	"PSI-98": {
		name: "SAFFIRE-I",
		topics: ["spread", "materials"],
		hardware: saffireHardware,
		objective: "Study the growth of a large fire and examine how material flammability in microgravity relates to ground screening.",
		reference: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-98"
	},
	"PSI-99": {
		name: "SAFFIRE-II",
		topics: ["spread", "materials"],
		hardware: saffireHardware,
		objective: "Examine flame spread on multiple spacecraft-material samples in microgravity.",
		reference: saffireReference
	},
	"PSI-100": {
		name: "SAFFIRE-III",
		topics: ["spread", "materials"],
		hardware: saffireHardware,
		objective: "Study flame growth and spread using a large solid sample in microgravity.",
		reference: saffireReference
	},
	"PSI-26": {
		name: "BASS",
		topics: [
			"spread",
			"extinction",
			"materials"
		],
		hardware: bassHardware,
		objective: "Examine the burning and extinction behavior of different solid fuels in microgravity.",
		reference: "https://www.nasa.gov/wp-content/uploads/2025/07/burning-and-suppression-of-solids-bass.pdf"
	},
	"PSI-25": {
		name: "BASS-II",
		topics: [
			"spread",
			"ignition",
			"extinction",
			"materials"
		],
		hardware: bassHardware,
		objective: "Study ignition, flame growth, spread and extinction of solid fuels in low-velocity forced flow.",
		reference: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25"
	}
};
function materialMatches(trial, term) {
	return [trial.material_original, trial.material_normalized].some((value) => value?.toLowerCase().includes(term.trim().toLowerCase()));
}
function hasSensor(trial, sensor) {
	return trial.series_channels.some((channel) => channel === sensor) || trial.investigation_id === "PSI-25" && trial.has_conditions && (sensor === "o2" || sensor === "co2" || sensor === "co" && trial.has_co);
}
function matchesResult(trial, result) {
	if (result === "series") return trial.has_series;
	if (result === "conditions") return trial.has_conditions;
	if (result === "catalog") return !trial.has_series && !trial.has_conditions;
	return true;
}
function trialPath(trial) {
	return "/discover?" + new URLSearchParams({
		investigation_id: trial.investigation_id,
		experiment_id: trial.experiment_id
	});
}
function rankTrial(trial, scenario) {
	const context = researchContext[trial.investigation_id];
	const criteria = [];
	function add(label, evidence, matches) {
		criteria.push({
			label,
			evidence: evidence ?? "Unavailable in integrated evidence",
			status: evidence === null ? "missing" : matches ? "match" : "different"
		});
	}
	if (scenario.objective) add("Research objective", context?.objective ?? null, context?.topics.includes(scenario.objective));
	if (scenario.gravity) add("Gravity context", context ? "Flight investigation in microgravity" : null, scenario.gravity === "microgravity");
	if (scenario.oxygen) {
		const value = trial.oxygen_ambient_pct;
		add("Ambient O₂ (±2 percentage points)", value === null ? null : (trial.oxygen_ambient_status === "approximate" ? "Approximately " : "") + value + " % ambient O₂", value !== null && Math.abs(value - Number(scenario.oxygen)) <= 2);
	}
	if (scenario.pressure) add("Total pressure", null, false);
	if (scenario.airflow) {
		const value = trial.air_velocity_cm_s;
		add("Airflow (±2 cm/s)", value === null ? null : value + " cm/s", value !== null && Math.abs(value - Number(scenario.airflow)) <= 2);
	}
	if (scenario.material.trim()) add("Material / fuel", trial.material_original ?? trial.material_normalized, materialMatches(trial, scenario.material));
	const matches = criteria.filter((criterion) => criterion.status === "match").length;
	return {
		trial,
		criteria,
		matches,
		score: criteria.length ? Math.round(matches / criteria.length * 100) : 0
	};
}
function rankStudies(trials, scenario) {
	const groups = /* @__PURE__ */ new Map();
	for (const trial of trials) {
		const results = groups.get(trial.investigation_id) ?? [];
		results.push(rankTrial(trial, scenario));
		groups.set(trial.investigation_id, results);
	}
	return [...groups].map(([id, results]) => {
		const quantitative = ({ trial }) => trial.has_series || trial.has_conditions;
		const best = results.sort((a, b) => b.matches - a.matches || Number(quantitative(b)) - Number(quantitative(a)) || a.trial.experiment_id.localeCompare(b.trial.experiment_id, "en"))[0];
		return {
			id,
			best,
			study: best.trial.study_name,
			score: best.score,
			matching: results.filter((result) => result.matches > 0).length,
			fullMatches: results.filter((result) => result.matches > 0 && result.matches === result.criteria.length).length,
			quantitative: results.filter(quantitative).length
		};
	}).sort((a, b) => b.score - a.score || a.study.localeCompare(b.study, "en") || a.id.localeCompare(b.id, "en"));
}
// ../../supabase/functions/_shared/trialComparison.ts
function textKey(value) {
	return typeof value === "string" ? value.trim().toLowerCase() || null : value;
}
function compareConditions(a, b) {
	const context = (trial) => researchContext[trial.investigation_id];
	return [
		{
			label: "Gravity context",
			value: (trial) => context(trial) ? "Microgravity investigation" : null
		},
		{
			label: "Test apparatus",
			value: (trial) => context(trial)?.hardware ?? null
		},
		{
			label: "Material / fuel",
			value: (trial) => trial.material_original || trial.material_normalized,
			key: (trial) => trial.material_normalized || trial.material_original
		},
		{
			label: "Ambient O₂ (%)",
			value: (trial) => trial.oxygen_ambient_pct,
			display: (trial) => trial.oxygen_ambient_pct === null ? null : (trial.oxygen_ambient_status === "approximate" ? "≈ " : "") + trial.oxygen_ambient_pct,
			uncertain: (trial) => trial.oxygen_ambient_status === "approximate"
		},
		{
			label: "Total pressure",
			value: () => null
		},
		{
			label: "Airflow (cm/s)",
			value: (trial) => trial.air_velocity_cm_s
		},
		{
			label: "Flow direction",
			value: (trial) => trial.flow_direction
		},
		{
			label: "Length (mm)",
			value: (trial) => trial.length_mm
		},
		{
			label: "Width (mm)",
			value: (trial) => trial.width_mm
		},
		{
			label: "Thickness (mm)",
			value: (trial) => trial.thickness_mm
		}
	].map(({ label, value, key = value, display = value, uncertain }) => {
		const left = textKey(key(a));
		const right = textKey(key(b));
		const status = left === null || right === null ? "Unavailable" : uncertain?.(a) || uncertain?.(b) ? "Approximate" : left === right ? "Match" : "Different";
		return {
			label,
			left: display(a),
			right: display(b),
			status
		};
	});
}
function hasChannelReadings(series, channel) {
	return series.rows.some((row) => Number.isFinite(row[channel]));
}
function channelUnit(series, channel) {
	return series.units.find((item) => item.channel === channel)?.unit;
}
function overlayLimitation(a, b, channel) {
	if (!hasChannelReadings(a, channel) || !hasChannelReadings(b, channel)) return "The selected channel has no readings for one or both trials in this window.";
	const unit = channelUnit(a, channel);
	if (!unit || unit !== channelUnit(b, channel)) return "The units are missing or differ for this channel.";
	if (a.time_reference !== "first_calibrated_record" || b.time_reference !== a.time_reference || a.time_unit !== "s" || b.time_unit !== "s") return "The time references are incompatible.";
	if (a.truncated || b.truncated) return "Choose a smaller window to compare both series completely.";
	return "";
}
// ../../supabase/functions/chart-assistant/evidence.ts
var channels = ["o2", "co2"];
function summarizeChart(series, channel) {
	const availableChannels = channels.filter((name) => series.units.some((unit) => unit.channel === name && unit.unit) && series.rows.some((row) => Number.isFinite(row[name]) && Number.isFinite(row.time_s)));
	const unit = series.units.find((item) => item.channel === channel)?.unit;
	if (!unit || !availableChannels.includes(channel) || series.truncated) return null;
	const readings = series.rows.map((row) => ({
		time_s: row.time_s,
		value: row[channel]
	})).filter((row) => Number.isFinite(row.value) && Number.isFinite(row.time_s));
	const values = readings.map((row) => row.value);
	const first = readings[0];
	const last = readings[readings.length - 1];
	return {
		availableChannels,
		evidence: {
			channel,
			unit,
			time_reference: series.time_reference,
			rows: series.rows.length,
			missing: series.rows.length - values.length,
			valid: values.length,
			first: first.value,
			last: last.value,
			first_time_s: first.time_s,
			last_time_s: last.time_s,
			delta_percentage_points: unit === "%" && readings.length > 1 ? last.value - first.value : null,
			min: Math.min(...values),
			max: Math.max(...values),
			mean: values.reduce((total, value) => total + value, 0) / values.length
		}
	};
}
function chartObservations(evidence) {
	const gas = evidence.channel === "o2" ? "oxygen" : "carbon dioxide";
	const direction = evidence.last > evidence.first ? "higher than" : evidence.last < evidence.first ? "lower than" : "equal to";
	return {
		overview: `The chart shows how measured ${gas} concentration varies with elapsed time in this trial. The readings and their units are listed below.`,
		endpoints: evidence.valid > 1 ? `The last valid reading was ${direction} the first. The values in between may follow a different pattern.` : "This window contains one valid reading. An endpoint comparison requires at least two.",
		gaps: evidence.missing > 0 ? "Some rows have no usable reading for this channel. The source does not identify the cause of those gaps." : "Every row in this window has a usable reading for this channel.",
		limits: "This chart alone cannot establish what caused a change or predict what will happen in another trial."
	};
}
// ../../supabase/functions/chart-assistant/retrieval.ts
var library = nasaResearch.map((study) => ({
	...study,
	id: study.title.toLowerCase().split(" and ")[0]
}));
var integratedIds = Object.keys(researchContext);
var fields = [
	[
		"material_original",
		"Material",
		""
	],
	[
		"air_velocity_cm_s",
		"Airflow",
		"cm/s"
	],
	[
		"flow_direction",
		"Flow direction",
		""
	],
	[
		"length_mm",
		"Sample length",
		"mm"
	],
	[
		"width_mm",
		"Sample width",
		"mm"
	],
	[
		"thickness_mm",
		"Sample thickness",
		"mm"
	],
	[
		"oxygen_ambient_pct",
		"Ambient oxygen",
		"%"
	],
	[
		"oxygen_initial_pct",
		"Initial oxygen",
		"%"
	],
	[
		"ignition_power_w",
		"Ignition power",
		"W"
	],
	[
		"burn_duration_s",
		"Burn duration",
		"s"
	]
];
var normal = (value) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
var chartPattern = /\b(chart|plot|axes|axis|graph|trend|data points|curve|grafica|eje|tendencia|curva)\b/;
var datasetPattern = /\b(conjuntos? de datos|dataset|datasets|data sets?|variables?|files?|units?|sensors?|measurements?|data|datos|unidades|sensores|mediciones)\b/;
var comparisonPattern = /\b(compare|comparison|comparable|differen\w*|compar\w+|diferenc\w+)\b/;
var modelPattern = /\b(modeling|modelling|predict\w*|machine learning|target|features|modelado|predecir|prediccion)\b/;
var topicPattern = /\b(fire|combustion|burn\w*|flames?|flammability|flammable|soot|smoke|ignition|extinction|fuels?|flammability|microgravity|ventilation|airflow|o2|co2|oxygen|carbon dioxide|lunar|spacecraft|fuego|llama\w*|hollin|humo|ignicion|extincion|combustible\w*|inflamabilidad|microgravedad|ventilacion|oxigeno|dioxido de carbono)\b/;
var unrelatedPattern = /\b(capital (?:of|de)|weather|clima de|stock price|precio de las acciones|football|soccer|futbol|write (?:a poem|code)|ignore (?:previous|all) instructions)\b/;
var referentialPattern = /\b(this|these|the other|it|they|its|here|that|them|esta|este|estas|estos|aqui|esa|ese|otra|otro|tiene|tienen|cual fue|el ensayo)\b/;
var researchPattern = /\b(where did (?:that|this) come from|de donde sale|study|studies|investigation\w*|experiment\w*|objective|method\w*|research|source\w*|investigacion\w*|objetivo|metod\w*|experimento\w*|fuente\w*)\b/;
var unsupportedMetric = /\b(temperature|temperatura|heat flux|flujo termico|humidity|humedad|mass loss|perdida de masa|heat release rate|flame height|altura de llama|flame spread rate|velocidad de propagacion|gravity level|nivel de gravedad|pressure|presion)\b/;
function source(title, url, extra = {}) {
	return hasSafeSource(url) ? [{
		...extra,
		title,
		url
	}] : [];
}
function trialSource(trial) {
	return source("NASA PSI · " + trial.study_name, trial.source_url, {
		experimentId: trial.experiment_id,
		investigationId: trial.investigation_id,
		datasetId: trial.has_series || trial.has_conditions ? trial.experiment_id : void 0,
		href: trialPath(trial)
	});
}
function explicitSubjects(question) {
	const trials = [...question.matchAll(/\bPSI-\d{1,3}:[\w.-]+:r\d+\b/gi)].map((match) => "PSI-" + match[0].slice(4));
	const studies = [...question.matchAll(/\bPSI-\d{1,3}\b/gi)].map((match) => match[0].toUpperCase());
	const query = normal(question);
	for (const [id, info] of Object.entries(researchContext)) if (new RegExp("\\b" + info.name.toLowerCase() + "(?![-\\w])").test(query)) studies.push(id);
	if (/\bcld flame\b/.test(query)) studies.push("PSI-21");
	for (const item of library) if (new RegExp("\\b" + item.id + "(?![-\\w])").test(query) || item.links.some((link) => {
		const label = link.label.split(" · ")[0].toLowerCase();
		return label.length >= 5 && query.includes(label);
	})) studies.push(item.id);
	return {
		trials: [...new Set(trials)].slice(0, 2),
		studies: [...new Set(studies)].slice(0, 5)
	};
}
function format(value) {
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 }).format(value);
}
async function retrieve(request, get) {
	const { message, context, conversationHistory } = request;
	const query = normal(message);
	const explicit = explicitSubjects(message);
	const referential = referentialPattern.test(query);
	const chartAsked = chartPattern.test(query) || Boolean(context.chart && /\b(what does (this|it) (mean|show)|que (significa|muestra) (esto|esta)|higher|lower|increased|decreased|minimum|maximum|increase|decrease|maximo|maxima|minimo|minima)\b/.test(query));
	const datasetAsked = datasetPattern.test(query);
	const compareAsked = comparisonPattern.test(query);
	const modelAsked = modelPattern.test(query);
	const researchAsked = researchPattern.test(query);
	const previousTurn = [...conversationHistory].reverse().find((turn) => turn.subjects.length > 0);
	const historySubjects = previousTurn?.subjects ?? [];
	const historyExplicit = explicitSubjects(previousTurn?.question ?? "");
	const pointsToPage = /\b(this|these|here|esta|este|estas|estos|aqui)\b/.test(query);
	const continuation = /^(?:and\b|y\b|what about\b|how about\b|que hay de\b)/.test(query.replace(/^[¿¡]+/, ""));
	const shortDataQuestion = query.split(/\s+/).length <= 6 && datasetAsked;
	const followUp = historySubjects.length > 0 && !pointsToPage && !explicit.studies.length && !explicit.trials.length && (referential && (datasetAsked || researchAsked || chartAsked) || continuation || shortDataQuestion);
	const cards = [];
	const subjects = [];
	let missing = "";
	const scoped = topicPattern.test(query) || explicit.studies.length || explicit.trials.length || chartAsked || datasetAsked || researchAsked || modelAsked || compareAsked || followUp || unsupportedMetric.test(query) || referential && (historySubjects.length || context.experimentId || context.investigationId);
	if (unrelatedPattern.test(query) || !scoped) return {
		status: "OUT_OF_SCOPE",
		cards,
		subjects,
		missing
	};
	function add(kind, value, sources) {
		if (!sources.length || cards.length >= 10) return;
		cards.push({
			id: "E" + (cards.length + 1),
			kind,
			text: value,
			citations: sources.map((item) => ({
				...item,
				id: [
					item.url,
					item.experimentId,
					item.datasetId
				].filter(Boolean).join("|")
			}))
		});
	}
	const namedStudy = explicit.studies.length > 0;
	const trialIds = explicit.trials.length ? explicit.trials : namedStudy ? [] : followUp ? historySubjects.filter((id) => id.includes(":")).slice(0, 2) : compareAsked || chartAsked && context.chart?.kind === "overlay" ? context.selectedExperiments?.length ? context.selectedExperiments : context.currentPage === "/flight-notebook" ? ["PSI-98:S1:r2", "PSI-100:S1:r2"] : [] : [context.experimentId ?? context.datasetId].filter((id) => Boolean(id?.includes(":")));
	const studyIds = explicit.studies.length ? explicit.studies : followUp ? historySubjects.filter((id) => !id.includes(":")).concat(historyExplicit.studies).slice(0, 5) : [context.investigationId, context.datasetId === "PSI-21" ? "PSI-21" : void 0].filter((id) => Boolean(id));
	const scenario = /\b(lunar|moon)\b/.test(query) ? scenarios.lunar : /\b(martian|mars|marte)\b/.test(query) ? scenarios.martian : context.scenario;
	const rankingAsked = Boolean(scenario && !namedStudy && (chartAsked && context.chart?.kind === "ranking" || /\b(rank\w*|score\w*|relevan\w*|scenario|escenario|puntuacion|habitat\w*)\b/.test(query)));
	const notebookAsked = !namedStudy && context.currentPage === "/flight-notebook" && !trialIds.length && (chartAsked || referential || topicPattern.test(query));
	const cldAsked = studyIds.includes("PSI-21") || chartAsked && context.chart?.kind === "test-days";
	const catalog = trialIds.length || rankingAsked || !studyIds.length && (datasetAsked || modelAsked) ? (await get("catalog", { view: "evidence" }))?.rows ?? [] : [];
	const trials = trialIds.flatMap((id) => catalog.find((row) => row.experiment_id.toLowerCase() === id.toLowerCase()) ?? []);
	subjects.push(...trials.map((item) => item.experiment_id));
	if (trialIds.length && trials.length !== trialIds.length) return {
		status: "INSUFFICIENT_EVIDENCE",
		cards,
		subjects,
		missing: "One or more trials could not be found in the integrated catalog."
	};
	if (compareAsked || chartAsked && context.chart?.kind === "overlay") {
		if (trials.length !== 2) {
			const studies = studyIds.filter((id) => integratedIds.includes(id));
			if (studies.length === 2) {
				const [a, b] = studies.map((id) => researchContext[id]);
				subjects.push(...studies);
				const sources = studies.flatMap((id) => source(researchContext[id].name, researchContext[id].reference, { investigationId: id }));
				add("Comparison", a.name + ": " + a.objective + " " + b.name + ": " + b.objective + (a.hardware !== b.hardware ? " The studies use different apparatus: " + a.hardware + " versus " + b.hardware + "." : " Both studies use " + a.hardware + ".") + " Select two trials to check materials, atmosphere, airflow and geometry before comparing outcomes.", sources);
				return {
					status: cards.length ? "ANSWERED" : "INSUFFICIENT_EVIDENCE",
					cards,
					subjects,
					missing
				};
			}
			return {
				status: "INSUFFICIENT_EVIDENCE",
				cards,
				subjects,
				missing: "Select two distinct trials in Compare or supply their IDs. A study name alone does not identify a test or its conditions."
			};
		}
		const [a, b] = trials;
		const conditions = compareConditions(a, b);
		const different = conditions.filter((row) => row.status === "Different");
		const uncertain = conditions.filter((row) => row.status === "Unavailable" || row.status === "Approximate");
		add("Comparison", (different.some((row) => row.label === "Test apparatus") ? "Not directly comparable" : different.length || uncertain.length ? "Partially comparable" : "Comparable on the documented fields") + ". " + (different.length ? "Documented differences: " + different.map((row) => row.label + " (" + row.left + " vs " + row.right + ")").join("; ") + ". " : "The documented fields agree. ") + (uncertain.length ? "Unavailable or approximate: " + uncertain.map((row) => row.label).join(", ") + ". " : "") + "Check ignition method and sensor placement in the source before comparing quantitative outcomes.", [...trialSource(a), ...trialSource(b)]);
		if (chartAsked && context.chart?.kind === "overlay") {
			const series = await fetchSeries([a, b], context.chart, get);
			const channel = context.chart.channel ?? "o2";
			if (series.every((item) => item !== null)) {
				const reason = overlayLimitation(series[0], series[1], channel);
				add(reason ? "Missing information" : "Comparison", reason || "The overlay uses separately elapsed seconds from the first calibrated sample for each trial. The common axis does not establish a shared ignition time.", [...trialSource(a), ...trialSource(b)]);
				if (!reason) series.forEach((item, index) => addGas([a, b][index], item, channel, add));
			}
		}
	} else if (rankingAsked) {
		const study = rankStudies(catalog, scenario).find((item) => item.best.criteria.length);
		if (study) {
			subjects.push(study.best.trial.investigation_id);
			add("Derived calculation", study.study + " is first in the integrated trial ranking for the selected criteria, at " + study.score + "% relevance. Representative trial " + study.best.trial.experiment_id + ". " + study.best.criteria.map((item) => item.label + ": " + item.status + " (" + item.evidence + ")").join("; ") + ". The score measures scenario relevance. It does not estimate fire risk.", trialSource(study.best.trial));
		}
	} else if (cldAsked) {
		subjects.push("PSI-21");
		const data = await get("catalog", {
			view: "test-days",
			investigation_id: "PSI-21"
		});
		if (data?.rows.length) {
			const counts = /* @__PURE__ */ new Map();
			for (const entry of data.rows) counts.set(entry.test_type, (counts.get(entry.test_type) ?? 0) + entry.flames_ignited);
			add("Derived calculation", "CLD Flame (ACME) records test date, test type and number of flames ignited (count). The integrated table has " + data.rows.length + " entries. Totals by type: " + [...counts].map(([type, count]) => type + " · " + count).join(", ") + ". These counts do not measure flame spread or soot concentration.", source("NASA PSI · CLD Flame experimental table", data.source.url, {
				investigationId: "PSI-21",
				datasetId: "PSI-21",
				href: "/discover?investigation_id=PSI-21"
			}));
		}
	} else if (notebookAsked) {
		subjects.push("PSI-98", "PSI-100");
		add("Experimental evidence", observation, source(notebookSources[0].label, notebookSources[0].url, { href: "/flight-notebook" }));
		add("Missing information", clockNote + " " + airflowNote, [...source(notebookSources[0].label, notebookSources[0].url), ...source(notebookSources[1].label, notebookSources[1].url)]);
	} else if (trials.length) {
		const active = trials[0];
		const topic = query.match(unsupportedMetric)?.[0];
		if (topic && !modelAsked && !(context.chart?.kind === "flame-fronts")) missing = "The integrated record does not provide a verified value for " + topic + ".";
		else if (chartAsked && context.chart?.kind === "conditions") {
			const measured = (await get("experiment", { experiment_id: active.experiment_id }))?.conditions.filter((row) => row.value !== null && (row.unit === "%" || row.unit === "ppm")) ?? [];
			if (measured.length) add("Measured data", "The condition charts group reported variables by unit (% or ppm) and plot the recorded condition value. " + measured.slice(0, 10).map((row) => row.field + ": " + row.value + " " + row.unit + (row.status ? " (" + row.status + ")" : "")).join("; ") + ". The axis lists condition fields. It does not describe elapsed time.", trialSource(active));
			if (!cards.length) missing = "No tabular conditions with charted values were found for this trial.";
		} else if (chartAsked && (context.chart?.kind === "gas" || active.has_series)) {
			const chart = context.chart?.kind === "gas" && (!followUp || context.experimentId === active.experiment_id) ? context.chart : void 0;
			const [series] = await fetchSeries([active], chart, get);
			const channel = chart?.channel ?? active.series_channels[0];
			if (series && channel) addGas(active, series, channel, add);
			if (!cards.length) missing = "No complete series with a documented unit is available for that channel and time window.";
		} else {
			if (researchAsked || !datasetAsked && !modelAsked) addStudy(active.investigation_id, add);
			if (datasetAsked || modelAsked || !researchAsked) await addDataset(active, add, get);
			if (modelAsked && cards.length) add("Interpretation", "Treat the recorded material, geometry and conditions as candidate inputs only when populated. Define a measured outcome, check missingness and evaluate on held-out trials before making predictions. The available trial metadata does not validate a model.", trialSource(active));
		}
	} else {
		const searched = studyIds.length ? studyIds : [];
		if (searched.length) subjects.push(...searched.slice(0, 3));
		const specificMetric = query.match(unsupportedMetric)?.[0];
		if (specificMetric && !modelAsked && !/\b(what|which|que|cuales) (?:studies|investigaciones|datasets)\b/.test(query)) missing = "The available records do not establish the requested value for " + specificMetric + ". Select a measured variable or consult the original source.";
		else {
			const ids = searched.filter((id) => integratedIds.includes(id));
			ids.forEach((id) => addStudy(id, add));
			if (datasetAsked && ids.length) {
				const inventory = await get("catalog", { view: "inventory" });
				for (const item of inventory?.rows ?? []) {
					if (!ids.includes(item.investigation_id)) continue;
					add("Derived calculation", researchContext[item.investigation_id].name + " has " + item.trials + " catalog trials, " + item.series_trials + " with synchronized series and " + item.conditions_trials + " with tabular conditions. Open a trial for measured variables and units.", source("NASA PSI · " + researchContext[item.investigation_id].name, item.source_url, {
						investigationId: item.investigation_id,
						href: "/resources/" + item.investigation_id
					}));
				}
			}
			const matchedLibrary = library.filter((item) => searched.includes(item.id) || item.links.some((link) => searched.some((id) => link.url.endsWith("/" + id))));
			const selectedLibrary = searched.length ? matchedLibrary.filter((item) => !ids.length || searched.includes(item.id) || searched.some((id) => !integratedIds.includes(id) && item.links.some((link) => link.url.endsWith("/" + id)))) : library.filter((item) => {
				const words = normal(item.topic + " " + item.summary).split(/\W+/);
				return query.split(/\W+/).some((word) => word.length > 4 && words.includes(word));
			});
			for (const item of selectedLibrary.slice(0, 4)) {
				if (!searched.length) subjects.push(item.id);
				add("Experimental evidence", item.title + ". " + item.summary + " " + item.coverage + ".", item.links.filter((link) => !searched.length || searched.includes(item.id) || searched.some((id) => link.url.endsWith("/" + id))).map((link) => source(link.label, link.url, { href: item.app?.path })[0]).filter(Boolean));
			}
			if (!searched.length && (datasetAsked || modelAsked)) {
				const filters = context.activeFilters ?? {};
				const selected = catalog.filter((row) => (row.has_conditions || row.has_series) && (!filters.material || materialMatches(row, filters.material)) && (!filters.investigation_id || row.investigation_id === filters.investigation_id) && (!filters.q || [
					row.experiment_id,
					row.study_name,
					row.material_original
				].some((value) => value?.toLowerCase().includes(filters.q.toLowerCase()))) && (!filters.direction || row.flow_direction === filters.direction) && (!filters.objective || researchContext[row.investigation_id]?.topics.includes(filters.objective)) && (!filters.sensor || hasSensor(row, filters.sensor)) && (!filters.flow_min || row.air_velocity_cm_s !== null && row.air_velocity_cm_s >= Number(filters.flow_min)) && (!filters.flow_max || row.air_velocity_cm_s !== null && row.air_velocity_cm_s <= Number(filters.flow_max)) && matchesResult(row, filters.coverage ?? ""));
				if (selected.length && modelAsked) {
					const sample = selected.find((trial) => trial.series_channels.length > 0) ?? selected[0];
					await addDataset(sample, add, get);
					add("Interpretation", "These recorded variables are possible model inputs. Choose a measurable outcome, check missing values and validate against held-out trials. A combustion measurement or scenario score alone does not validate a flammability model.", trialSource(sample));
				} else if (selected.length && !selectedLibrary.length) add("Derived calculation", selected.length + " integrated trials in this selection supply synchronized series or tabular conditions. Select a trial to inspect its variables, units and source.", selected.slice(0, 3).flatMap(trialSource));
			}
		}
	}
	return {
		status: cards.length ? "ANSWERED" : "INSUFFICIENT_EVIDENCE",
		cards,
		subjects: [...new Set(subjects)].slice(0, 3),
		missing
	};
}
function addStudy(id, add) {
	const info = researchContext[id];
	if (info) add("Experimental evidence", info.name + ". " + info.objective + " Apparatus: " + info.hardware + ".", source("NASA · " + info.name, info.reference, {
		investigationId: id,
		href: "/resources/" + id
	}));
}
async function fetchSeries(trials, chart, get) {
	return await Promise.all(trials.map((trial) => get("series", {
		experiment_id: trial.experiment_id,
		from_s: String(chart?.from ?? 0),
		to_s: String(chart?.to ?? 60)
	})));
}
function addGas(trial, series, channel, add) {
	const summary = summarizeChart(series, channel);
	if (!summary) return;
	const { evidence } = summary;
	const notes = chartObservations(evidence);
	const sensor = channel === "o2" ? "oxygen (O₂)" : "carbon dioxide (CO₂)";
	const sources = hasSafeSource(series.source.url) ? [{
		...trialSource(trial)[0],
		title: "NASA PSI · " + trial.study_name,
		url: series.source.url,
		experimentId: trial.experiment_id,
		datasetId: trial.experiment_id
	}] : trialSource(trial);
	add("Measured data", trial.experiment_id + " plots elapsed time in seconds from the first calibrated record on X and measured " + sensor + " (" + evidence.unit + ") on Y. First valid reading: " + format(evidence.first) + " " + evidence.unit + " at " + format(evidence.first_time_s) + " s. Last valid: " + format(evidence.last) + " " + evidence.unit + " at " + format(evidence.last_time_s) + " s. " + evidence.valid + " valid readings and " + evidence.missing + " missing in this window.", sources);
	add("Derived calculation", notes.endpoints + " Observed range: " + format(evidence.min) + " to " + format(evidence.max) + " " + evidence.unit + ". " + notes.limits, sources);
}
async function addDataset(trial, add, get) {
	const known = fields.flatMap(([key, label, unit]) => {
		const value = trial[key];
		if (value === null || value === void 0) return [];
		const qualifier = key === "oxygen_ambient_pct" ? trial.oxygen_ambient_status : key === "oxygen_initial_pct" ? trial.oxygen_initial_status : null;
		return [label + " " + value + (unit ? " " + unit : "") + (qualifier ? " (" + qualifier + ")" : "")];
	});
	const detail = trial.has_conditions ? await get("experiment", { experiment_id: trial.experiment_id }) : null;
	const variables = [...new Set(detail?.conditions.filter((row) => row.value !== null || row.lower_bound !== null || row.upper_bound !== null).map((row) => row.field + (row.unit ? " (" + row.unit + ")" : "") + (row.method ? " · " + row.method.replaceAll("_", " ") : "")) ?? [])];
	const availability = [trial.series_channels.length ? "Recorded series channels: " + trial.series_channels.map((name) => name === "o2" ? "oxygen (O₂, %)" : "carbon dioxide (CO₂, %)").join(", ") + ". The time axis is elapsed seconds." : "Documented synchronized series channels are unavailable.", variables.length ? "Reported conditions: " + variables.slice(0, 14).join("; ") + "." : "Tabular variable values are unavailable."].join(" ");
	add("Experimental evidence", trial.experiment_id + " · " + trial.study_name + ". " + (known.length ? "Recorded trial metadata: " + known.join("; ") + ". " : "Sample and setup values are unavailable. ") + availability, trialSource(trial));
}
// ../../supabase/functions/chart-assistant/chatRequest.ts
var trial = /^PSI-\d{1,3}:[\w.-]+:r\d+$/;
var investigation = /^PSI-\d{1,3}$/;
var id = /^(?:PSI-\d{1,3}(?::[\w.-]+:r\d+)?|[a-z][a-z0-9-]{1,59})$/i;
var kinds = [
	"gas",
	"conditions",
	"overlay",
	"ranking",
	"test-days",
	"flame-fronts"
];
var filters = [
	"q",
	"material",
	"direction",
	"sensor",
	"coverage",
	"objective",
	"flow_min",
	"flow_max",
	"investigation_id"
];
function record(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function text(value, size) {
	return typeof value === "string" ? value.trim().slice(0, size) : "";
}
function matching(value, pattern) {
	return typeof value === "string" && value.length <= 100 && pattern.test(value) ? value : void 0;
}
function parseChatRequest(value) {
	const request = record(value);
	if (typeof request.message !== "string" || !request.message.trim() || request.message.length > 1200) return;
	const raw = record(request.context);
	const chart = record(raw.chart);
	const from = chart.from;
	const to = chart.to;
	const kind = kinds.find((item) => item === chart.kind);
	const validWindow = typeof from === "number" && typeof to === "number" && Number.isFinite(from) && Number.isFinite(to) && from >= 0 && to >= from && to - from <= 60;
	const scenario = record(raw.scenario);
	const rawFilters = record(raw.activeFilters);
	const activeFilters = Object.fromEntries(filters.flatMap((name) => {
		const value = text(rawFilters[name], 120);
		return value ? [[name, value]] : [];
	}));
	return {
		message: request.message.trim(),
		context: {
			currentPage: text(raw.currentPage, 60),
			experimentId: matching(raw.experimentId, trial),
			investigationId: matching(raw.investigationId, investigation),
			datasetId: matching(raw.datasetId, id),
			selectedExperiments: Array.isArray(raw.selectedExperiments) ? [...new Set(raw.selectedExperiments.slice(0, 2).flatMap((value) => matching(value, trial) ?? []))] : [],
			chart: kind ? {
				kind,
				channel: chart.channel === "o2" || chart.channel === "co2" ? chart.channel : void 0,
				from: validWindow ? from : void 0,
				to: validWindow ? to : void 0
			} : void 0,
			scenario: Object.keys(scenario).length ? {
				gravity: text(scenario.gravity, 50),
				oxygen: text(scenario.oxygen, 20),
				pressure: text(scenario.pressure, 20),
				airflow: text(scenario.airflow, 20),
				material: text(scenario.material, 100),
				objective: Object.keys(objectives).find((key) => key === scenario.objective) ?? ""
			} : void 0,
			activeFilters
		},
		conversationHistory: Array.isArray(request.conversationHistory) ? request.conversationHistory.slice(-4).map((item) => {
			const turn = record(item);
			return {
				question: text(turn.question, 300),
				subjects: Array.isArray(turn.subjects) ? turn.subjects.slice(0, 3).flatMap((value) => matching(value, id) ?? []) : []
			};
		}) : []
	};
}
// ../../supabase/functions/chart-assistant/chat.ts
function emptyReply(status, detail = "") {
	return {
		status,
		answer: [messages[status], detail].filter(Boolean).join(" "),
		citations: [],
		evidence: [],
		relatedExperiments: [],
		relatedDatasets: [],
		subjects: []
	};
}
function validateSelection(raw, cards) {
	const parsed = JSON.parse(raw);
	if (!parsed || typeof parsed !== "object" || !("evidenceIds" in parsed) || !Array.isArray(parsed.evidenceIds) || !parsed.evidenceIds.length || parsed.evidenceIds.length > 5 || !parsed.evidenceIds.every((id) => typeof id === "string" && cards.some((card) => card.id === id))) throw new Error("Invalid evidence selection");
	return [...new Set(parsed.evidenceIds)];
}
async function answerChat(input, get, select) {
	try {
		const { status, cards, subjects, missing } = await retrieve(input, get);
		if (status !== "ANSWERED") return {
			...emptyReply(status, missing),
			subjects
		};
		let choice = null;
		try {
			choice = await select(input, cards);
		} catch {}
		const order = new Map(choice?.ids.map((id, index) => [id, index]));
		const selected = [...cards].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
		const required = cards.filter((card) => [
			"Comparison",
			"Missing information",
			"Measured data"
		].includes(card.kind));
		const evidence = [.../* @__PURE__ */ new Set([...selected.slice(0, 5), ...required])];
		const citations = [...new Map(evidence.flatMap((card) => card.citations).map((citation) => [citation.id, citation])).values()];
		return {
			...emptyReply(status),
			provider: choice?.provider,
			evidence,
			citations,
			subjects,
			relatedExperiments: [...new Set(citations.flatMap((citation) => citation.experimentId ?? []))],
			relatedDatasets: [...new Set(citations.flatMap((citation) => citation.datasetId ?? []))]
		};
	} catch {
		return emptyReply("ERROR");
	}
}
export { answerChat, emptyReply, parseChatRequest, validateSelection };
