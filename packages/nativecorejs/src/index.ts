import './install-template-globals.js';
export {
	CoreComponent,
	defineComponent
} from '../.nativecore/core/component.js';
export { CoreController } from '../.nativecore/core/controller.js';
export { Router } from '../.nativecore/core/router.js';
export { createLazyController } from '../.nativecore/core/lazyController.js';
export { createMiddleware } from '../.nativecore/core/createMiddleware.js';
export { componentRegistry, initLazyComponents } from '../.nativecore/core/lazyComponents.js';
export { useState, computed, effect, batch, untrack, peek } from '../.nativecore/core/state.js';
export { createContext, inject, provide, ContextRequestEvent, CONTEXT_REQUEST } from '../.nativecore/core/context.js';
export type { ContextKey } from '../.nativecore/core/context.js';
export { resource } from '../.nativecore/core/resource.js';
export type { Resource, ResourceOptions } from '../.nativecore/core/resource.js';
export { reconcile } from '../.nativecore/utils/reconcile.js';
export type { ReconcileKey } from '../.nativecore/utils/reconcile.js';
export { clickOutside, mediaQuery, observe } from '../.nativecore/utils/observe.js';
export type { MediaQueryHandle, ObserveOptions } from '../.nativecore/utils/observe.js';
export { portal } from '../.nativecore/utils/portal.js';
export { mountDevTools } from '../.nativecore/core/devtools.js';
export {
	LoadingSpinner,
	NcA,
	NcAccordion,
	NcAccordionItem,
	NcAlert,
	NcAnimation,
	NcAutocomplete,
	NcAvatar,
	NcAvatarGroup,
	NcBadge,
	NcBottomNav,
	NcBottomNavItem,
	NcBreadcrumb,
	NcButton,
	NcCard,
	NcCheckbox,
	NcChip,
	NcCode,
	NcCollapsible,
	NcColorPicker,
	NcCopyButton,
	NcDatePicker,
	NcDiv,
	NcDivider,
	NcDrawer,
	NcDropdown,
	NcEmptyState,
	NcErrorBoundary,
	NcField,
	NcFileUpload,
	NcForm,
	NcImage,
	NcInput,
	NcKbd
	,NcNumberInput
	,NcMenu
	,NcMenuItem
	,NcModal
	,NcNavItem
	,NcOtpInput
	,NcPagination
	,NcPopover
	,NcProgress
	,NcProgressCircular
	,NcRadio
	,NcRating
	,NcRichText
	,NcScrollTop
	,NcSelect
	,NcSkeleton
	,NcSlider
	,NcSnackbar
	,NcStep
	,NcStepper
	,NcSwitch
	,NcTabItem
	,NcTable
	,NcTabs
	,NcTagInput
	,NcTextarea
	,NcTimePicker
	,NcTimeline
	,NcTimelineItem
	,NcTooltip
	,NcTransition
	,NcViewTransition
} from './components/index.js';
export { builtinComponentManifest, registerBuiltinComponents } from './components/builtinRegistry.js';
export {
	GPUAnimation,
	addPassiveListener,
	animate,
	cleanupAnimation,
	createAnimationLoop,
	fadeIn,
	fadeOut,
	prepareForAnimation,
	rafThrottle,
	scaleIn,
	setGPUTransform,
	setTransformVars,
	slideIn,
	throttle
} from '../.nativecore/core/gpu-animation.js';
export { bustCache, cacheVersion, importWithBust } from '../.nativecore/utils/cacheBuster.js';
export { trapFocus, announce, roving, lockBodyScroll } from './a11y/index.js';
export { debounce } from '../.nativecore/utils/timing.js';
export { persistState } from '../.nativecore/utils/persist.js';
export type { Debounced } from '../.nativecore/utils/timing.js';
export type { PersistStateOptions, PersistStorage } from '../.nativecore/utils/persist.js';
export { onError, handleError } from '../.nativecore/core/errorHandler.js';
export type { ErrorInfo } from '../.nativecore/core/errorHandler.js';
export { dom } from '../.nativecore/utils/dom.js';
export type {
	AttrMap,
	AttrValue,
	Child,
	CreateOptions,
	PropMap,
} from '../.nativecore/utils/dom.js';
export { css, html, unsafeHTML, escapeHTML, sanitizeURL, raw } from '../.nativecore/utils/templates.js';
export {
	bindEvents,
	delegate,
	on,
	onBlur,
	onChange,
	onClick,
	onDblclick,
	onFocus,
	onFocusin,
	onFocusout,
	onInput,
	onKeydown,
	onKeyup,
	onMouseenter,
	onMouseleave,
	onScroll,
	onSubmit,
	trackEvents,
	trackSubscriptions
} from '../.nativecore/utils/events.js';
// Wires utils are legacy — use ref + this.bind + this.on. Not re-exported.
export { connectSSE } from '../.nativecore/core/sse.js';

export { http, HttpClient, HttpError } from '../.nativecore/core/http.js';
export type {
	Backoff,
	HttpMethod,
	HttpRequestConfig,
	HttpResult,
	RequestInterceptor,
	ResponseInterceptor
} from '../.nativecore/core/http.js';

export { useForm, useFieldArray } from '../.nativecore/core/form.js';
export type { FieldArray, UseFormOptions, UseFormResult } from '../.nativecore/core/form.js';

export {
	required,
	minLength,
	maxLength,
	pattern,
	email,
	url,
	min,
	max,
	oneOf,
	compose
} from '../.nativecore/core/validators.js';
export type { AsyncValidator, Validator } from '../.nativecore/core/validators.js';

export { I18n, i18n, t, configureI18n } from '../.nativecore/core/i18n.js';
export type {
	I18nOptions,
	LocaleCode,
	MessageDictionary,
	MessagesByLocale,
	NamespaceLoader
} from '../.nativecore/core/i18n.js';

export { connectWebSocket } from '../.nativecore/core/ws.js';
export type {
	WSConnectOptions,
	WSController,
	WSHandlers,
	WSHeartbeat,
	WSReconnectOptions
} from '../.nativecore/core/ws.js';

export type {
	ComponentConstructor,
	ComponentState
} from '../.nativecore/core/component.js';

export { ROUTE_ERROR_EVENT } from '../.nativecore/core/router.js';
export type {
	CachePolicy,
	ControllerFunction,
	MiddlewareFunction,
	RouteConfig,
	RouteMatch
} from '../.nativecore/core/router.js';

export type {
	ComputedState,
	EffectCallback,
	EffectCleanup,
	State
} from '../.nativecore/core/state.js';

export {
	registerPlugin,
	unregisterPlugin,
	listPlugins
} from './plugin.js';

export type { NCPlugin, NCPluginNavigateContext } from './plugin.js';

export type { SSEConnectOptions, SSEHandlers } from '../.nativecore/core/sse.js';


