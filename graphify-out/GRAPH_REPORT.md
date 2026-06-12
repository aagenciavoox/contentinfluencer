# Graph Report - content-os  (2026-06-12)

## Corpus Check
- 264 files · ~251,834 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1176 nodes · 2113 edges · 56 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 176 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 115 edges
2. `generateUUID()` - 54 edges
3. `useAppContext()` - 49 edges
4. `useIsMobile()` - 43 edges
5. `htmlToReadableText()` - 26 edges
6. `BottomSheetModal()` - 25 edges
7. `buildContentDetailRoute()` - 22 edges
8. `createContentDraft()` - 18 edges
9. `navigate()` - 17 edges
10. `MobileEmptyState()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `handleSalvarCampanha()` --calls--> `generateUUID()`  [INFERRED]
  src/features/library/pages/BookDetailPage.tsx → src/utils/uuid.ts
- `handleTurnIntoIdea()` --calls--> `generateUUID()`  [INFERRED]
  src/features/library/pages/LibraryPage.tsx → src/utils/uuid.ts
- `openBulkPage()` --calls--> `navigate()`  [INFERRED]
  src/features/settings/pages/SeriesSettingsPage.tsx → src/features/programacao/pages/ProgramacaoPage.tsx
- `openTeleprompter()` --calls--> `navigate()`  [INFERRED]
  src/mobile/components/SendToRecordingSheet.tsx → src/features/programacao/pages/ProgramacaoPage.tsx
- `openBlockPage()` --calls--> `navigate()`  [INFERRED]
  src/mobile/components/SendToRecordingSheet.tsx → src/features/programacao/pages/ProgramacaoPage.tsx

## Communities (109 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (25): getPersistenceApi(), persistAction(), persistContentRecord(), createContent(), createMockApi(), createState(), testPersistActionPromoteIdeaArchivesIdeaAndPersistsContent(), testPersistActionWritesLooksAndCenarios() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (31): BurstModeExperience(), clamp(), getResolvedTextColor(), getScriptLabel(), getItemsForDay(), getItemsForDay(), CalendarHoverCard(), scriptWordCount() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (33): handleAddFromQueue(), handleMove(), handleNameBlur(), handleRemove(), handleTagsChange(), handleTeleprompterToggle(), persistBlockMeta(), getBlockSummary() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), CacheFirst, cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL() (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (31): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), CacheFirst, cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL() (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (22): PostingTimeSuggestions(), AppProvider(), AuthProvider(), useAuth(), normalizeProjetoTipo(), saveProjeto(), getPostingTimes(), getTimesForDay() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (28): ContentDetailMobileScreen(), handlePrimaryAction(), persist(), setTab(), ContentHistoryPanel(), stageIndex(), canAdvanceToRecording(), canSchedulePosting() (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (25): checkForPwaUpdate(), forceMobileRefresh(), setPwaUpdateHandler(), registerPwaUpdates(), clearSaveFeedback(), emit(), getErrorMessage(), getSaveFeedbackState() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (13): IdeaQuickCapture(), MobileAppShell(), MobileBottomNav(), getMobileRouteMeta(), useHideOnScroll(), usePullToRefresh(), getModuleFlags(), isConteudosListPath() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (9): loadMobileKinds(), buildCalendarEntries(), readStoredJson(), writeStoredJson(), handleCancelEdit(), loadDayPanelOpen(), loadLayers(), resetDraft() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (17): MobileToggleSwitch(), getGentleExperienceSettings(), readBooleanSetting(), testDefaultsToGentleExperience(), testIgnoresInvalidIndividualValues(), testIgnoresInvalidPreferenceShape(), testMergesSavedPartialPreferences(), AnalyticsPage() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (16): LibraryItemCard(), isCompletedStatus(), appendUniqueToken(), handleCriarLivro(), handleOpenModal(), handleTurnIntoIdea(), normalizeToken(), removeToken() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (17): handleNewContent(), handleNewIdea(), buildContentDetailRoute(), createContentDraft(), buildDetailBackState(), handleNewContent(), handleCriarConteudo(), handlePromoteIdeia() (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (5): PrecacheStrategy, Strategy, StrategyHandler, timeout(), toRequest()

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (16): applyScheduleToContent(), applyUnscheduleToContent(), buildProgramacaoCards(), earliestPlatformDate(), getPlatformColor(), isBacklogCard(), isCardLocked(), applyTime() (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (6): AnalyticsMobileScreen(), MobileEmptyState(), MobileListCard(), BottomSheetModal(), handleCreate(), handleCreate()

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (3): PrecacheStrategy, StrategyHandler, toRequest()

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (8): CacheExpiration, cacheMatchIgnoreParams(), CacheTimestampsModel, deleteDB(), dontWaitFor(), normalizeURL(), removeIgnoredSearchParams(), stripParams()

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (8): CacheExpiration, cacheMatchIgnoreParams(), CacheTimestampsModel, dontWaitFor(), normalizeURL(), openDB(), removeIgnoredSearchParams(), stripParams()

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (8): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), isType(), normalizeHandler(), registerQuotaErrorCallback(), Route, Router

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (8): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), isType(), normalizeHandler(), registerQuotaErrorCallback(), Route, Router

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (6): handleAddAnotacao(), handleBrainstormConteudo(), handleBrainstormIdeia(), handleSalvarCampanha(), handleTransformarEmConteudo(), handleTransformarEmIdeia()

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (10): handleAddAnotacao(), handleClose(), handleAddAnotacao(), handleTransformarEmIdeia(), handleAddRule(), handleSave(), handleAdd(), isPadrao() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (4): IdeaInboxCard(), handleAddIdea(), saveIdea(), PipelineActionBar()

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (6): CacheableResponse, getFriendlyURL(), isArray(), isArrayOfClass(), NavigationRoute, Strategy

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (3): createCacheKey(), PrecacheController, waitUntil()

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (6): useBodyScrollLock(), useIsMobile(), BottomSheet(), Dialog(), FixedPanelModal(), SettingsSubSidebar()

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (4): MobileGridCard(), ListItem(), Surface(), Text()

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (4): ContentsDesktop(), loadPipelinePreferences(), savePipelinePreferences(), ConfirmModal()

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (7): CacheableResponse, getFriendlyURL(), isArray(), isArrayOfClass(), isInstance(), NavigationRoute, RegExpRoute

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (4): isInstance(), NetworkFirst, RegExpRoute, waitUntil()

### Community 33 - "Community 33"
Cohesion: 0.2
Nodes (5): buildPlatformRecord(), emptyRow(), handleKeyDown(), handleSave(), wordCount()

### Community 34 - "Community 34"
Cohesion: 0.3
Nodes (11): addBloco(), closeTemplateEditor(), deleteBloco(), deleteTemplate(), handleCreateTemplate(), moveBloco(), openTemplateEditor(), saveBloco() (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (4): SidePanel(), OverlayBody(), closePanel(), handleSave()

### Community 38 - "Community 38"
Cohesion: 0.36
Nodes (5): normalizeAction(), normalizeContentId(), appReducer(), deriveTheme(), isUUID()

### Community 39 - "Community 39"
Cohesion: 0.52
Nodes (5): shouldSkipRealtimeRefresh(), testAllowsRealtimeRefreshAfterSuppressionWindow(), testAllowsRealtimeRefreshWithoutLocalMutation(), testSkipsRealtimeRefreshForRecentLocalMutation(), testSkipsRealtimeRefreshWhilePersistInFlight()

### Community 41 - "Community 41"
Cohesion: 0.47
Nodes (3): ensurePlatformRecord(), togglePlatform(), updatePlatform()

### Community 43 - "Community 43"
Cohesion: 0.47
Nodes (5): addToExisting(), attachToBlock(), createBlock(), openBlockPage(), openTeleprompter()

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (3): MobilePillButton(), closePanel(), handleSave()

### Community 48 - "Community 48"
Cohesion: 0.6
Nodes (3): ensurePlatformRecord(), togglePlatform(), updatePlatform()

### Community 50 - "Community 50"
Cohesion: 0.6
Nodes (4): handleSubmit(), handleToggleMode(), normalizeAuthError(), resetStates()

### Community 56 - "Community 56"
Cohesion: 0.83
Nodes (3): handleAddListItem(), handleRemoveListItem(), updateField()

## Knowledge Gaps
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 12` to `Community 1`, `Community 2`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 15`, `Community 16`, `Community 23`, `Community 24`, `Community 27`, `Community 28`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 41`, `Community 42`, `Community 44`, `Community 45`, `Community 48`, `Community 49`, `Community 50`, `Community 53`, `Community 54`, `Community 58`, `Community 59`, `Community 60`, `Community 65`, `Community 66`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `useAppContext()` connect `Community 1` to `Community 2`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 15`, `Community 22`, `Community 23`, `Community 24`, `Community 29`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 51`, `Community 61`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `useIsMobile()` connect `Community 27` to `Community 1`, `Community 2`, `Community 34`, `Community 36`, `Community 5`, `Community 37`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 44`, `Community 16`, `Community 29`, `Community 22`, `Community 23`, `Community 24`, `Community 61`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `generateUUID()` (e.g. with `normalizeContentId()` and `createContentDraft()`) actually correct?**
  _`generateUUID()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `useAppContext()` (e.g. with `AnalyticsPage()` and `BurstModeExperience()`) actually correct?**
  _`useAppContext()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `useIsMobile()` (e.g. with `BottomSheet()` and `Dialog()`) actually correct?**
  _`useIsMobile()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `htmlToReadableText()` (e.g. with `getScriptLabel()` and `ContentPreviewSheet()`) actually correct?**
  _`htmlToReadableText()` has 10 INFERRED edges - model-reasoned connections that need verification._