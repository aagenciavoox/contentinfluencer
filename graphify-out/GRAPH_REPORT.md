# Graph Report - content-os  (2026-07-08)

## Corpus Check
- 350 files · ~283,339 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1713 nodes · 3482 edges · 95 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 376 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
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
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 104|Community 104]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 147 edges
2. `Text()` - 104 edges
3. `generateUUID()` - 67 edges
4. `useAppContext()` - 61 edges
5. `useIsMobile()` - 49 edges
6. `htmlToReadableText()` - 41 edges
7. `useAuth()` - 31 edges
8. `createContentDraft()` - 27 edges
9. `BottomSheetModal()` - 26 edges
10. `normalizeContentStatus()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `getScriptLabel()` --calls--> `htmlToReadableText()`  [INFERRED]
  src/features/contents/components/burst-mode/BurstModeExperience.tsx → src/lib/utils.ts
- `handleAddAnotacao()` --calls--> `generateUUID()`  [INFERRED]
  src/features/library/components/modals/BookNotesModal.tsx → src/utils/uuid.ts
- `handleSalvarCampanha()` --calls--> `generateUUID()`  [INFERRED]
  src/features/library/pages/BookDetailPage.tsx → src/utils/uuid.ts
- `wordCount()` --calls--> `htmlToReadableText()`  [INFERRED]
  src/features/settings/components/SeriesBulkComposer.tsx → src/lib/utils.ts
- `getScriptLabel()` --calls--> `htmlToReadableText()`  [INFERRED]
  src/features/recording/components/desktop/RecordingQueueTab.tsx → src/lib/utils.ts

## Communities (156 total, 23 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (47): buildPostedVideoContent(), handleSave(), resetForAnother(), applyScheduleToContent(), applyUnscheduleToContent(), buildProgramacaoCards(), buildProjetoPublicacaoByDate(), canDragCard() (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (49): IdeaInboxCard(), getPersistenceApi(), persistAction(), persistContentRecord(), createContent(), createMockApi(), createState(), testPersistActionDemoteContentsCreatesIdeaWhenUnlinked() (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (40): BurstModeExperience(), clamp(), getResolvedTextColor(), getScriptLabel(), handleAddFromQueue(), handleMove(), handleNameBlur(), handleRemove() (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (31): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), CacheFirst, cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (29): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL(), Deferred (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (16): LibraryItemCard(), isCompletedStatus(), appendUniqueToken(), handleOpenModal(), handleTurnIntoIdea(), normalizeToken(), removeToken(), resetForm() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (10): MobileEmptyState(), MobileListCard(), MobilePillButton(), MobileSectionHeader(), ContentDetailMobileScreen(), scriptWordCount(), BottomSheetModal(), closePanel() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (4): MobileIconButton(), cn(), PageContainer(), IconButton()

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (13): filterByTab(), contentPreviewText(), filterAndSortSeriesContents(), filterAndSortSeriesListItems(), formatContentListTimestamp(), matchesSearch(), scriptWordCount(), seriesListItemId() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (5): getFriendlyURL(), PrecacheStrategy, Strategy, StrategyHandler, toRequest()

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (10): loadMobileKinds(), buildCalendarEntries(), readStoredJson(), writeStoredJson(), handleCancelEdit(), handleSave(), loadDayPanelOpen(), loadLayers() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (20): handlePrimaryAction(), persist(), setTab(), stageIndex(), applyStatusMilestones(), canAdvanceToRecording(), canSchedulePosting(), getContentStage() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (6): CacheFirst, executeQuotaErrorCallbacks(), PrecacheStrategy, StrategyHandler, timeout(), toRequest()

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (10): AppProvider(), AuthProvider(), useAuth(), useNavCounts(), fetchContentStats(), buildSidebarSections(), isNavItemHidden(), isSettingsNavActive() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (14): buildContentDetailRoute(), createContentDraft(), buildDetailBackState(), handleNewContent(), handleCriarConteudo(), handlePromoteIdeia(), handleAddContent(), openContentDetail() (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (17): checkForPwaUpdate(), forceMobileRefresh(), clearSaveFeedback(), emit(), notifySaveFeedback(), broadcastDataSync(), getChannel(), subscribeDataSync() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (19): normalizeAction(), normalizeContentId(), getDomainsForRealtimeTable(), getListNamespacesForRealtimeTable(), buildDomainCacheKey(), collectDomainCacheKeys(), patchContentsInDomainCaches(), patchDomainCache() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (4): fetchCampanhaPublica(), SeriesStatsRow(), ListItem(), Surface()

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (8): CacheableResponse, getFriendlyURL(), getOrCreateDefaultRouter(), isArray(), isInstance(), RegExpRoute, Router, Strategy

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (9): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), isType(), normalizeHandler(), registerQuotaErrorCallback(), registerRoute(), Route (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (12): BookDetailPage(), getCoverageLabels(), getCreatorLabel(), getItemTypeLabel(), getProgressLabels(), getTechnicalLabels(), handleAddAnotacao(), handleBrainstormConteudo() (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (14): ContentScriptWorkspace(), computeSeriesContentStats(), getInboxIdeasForSeriesScripts(), getSeriesInboxIdeas(), isIncompleteRoteiro(), htmlToReadableText(), RoteiroSection(), handleKeyDown() (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (8): CacheExpiration, cacheMatchIgnoreParams(), CacheTimestampsModel, dontWaitFor(), normalizeURL(), openDB(), removeIgnoredSearchParams(), stripParams()

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (17): handleNewContent(), handleNewIdea(), navigate(), openBlockPage(), openTeleprompter(), handleKeyDown(), handleSelect(), handleAddToExistingBlock() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (13): AnalyticsMobileScreen(), MobileToggleSwitch(), getGentleExperienceSettings(), readBooleanSetting(), testDefaultsToGentleExperience(), testIgnoresInvalidIndividualValues(), testIgnoresInvalidPreferenceShape(), testMergesSavedPartialPreferences() (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (7): useAppContext(), getModuleFlags(), setPwaUpdateHandler(), registerPwaUpdates(), LooksSettingsPage(), ModuleRoute(), SettingsSubSidebar()

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (9): contentPreviewText(), contentTypeLabel(), handleCreateBulkContents(), scriptWordCount(), SeriesContentsFilterBar(), SeriesContentsTabs(), SeriesContentsToolbar(), SeriesCreateContentDrawer() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (3): usePaginatedQuery(), DataCache, handleAdd()

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (6): buildListPageSearchParams(), parseListLimitParam(), parseListMoreParam(), parseListPageParam(), loadPipelinePreferences(), savePipelinePreferences()

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (3): PilarEditForm(), pilarSlugFromNome(), formatCrossedPostingPreview()

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (7): ExpirationPlugin, hasMethod(), isOneOf(), isType(), normalizeHandler(), registerQuotaErrorCallback(), Route

### Community 33 - "Community 33"
Cohesion: 0.32
Nodes (10): ContentPreviewSheet(), buildContentMetaLine(), formatLastEdit(), getDisplayTitle(), getScriptWordCount(), getStatusChipClass(), getUsefulExcerpt(), isDraftTitle() (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.19
Nodes (14): ContentHistoryPanel(), getDisplayStatus(), normalizeContentStatus(), testDisplayStatusFuturePublishDate(), testDisplayStatusPastPublishDateKeepsCanonical(), testDisplayStatusPostedIgnoresFutureDate(), testNormalizeLegacyStatuses(), isEditorialContentStatus() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (6): addHashtag(), ensurePlatformRecord(), joinHashtags(), parseHashtags(), setHashtags(), updatePlatform()

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (6): IdeaQuickCapture(), MobileAppShell(), MobileBottomNav(), getMobileRouteMeta(), useHideOnScroll(), usePullToRefresh()

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (8): isContentBodyLoaded(), upsertContent(), isConteudosListPath(), resolveContentDetailBack(), resolveRouteBack(), useContentDetailBack(), useContentDetailBackGuard(), ContentDetailPage()

### Community 39 - "Community 39"
Cohesion: 0.21
Nodes (9): SerieProductionMetricsPanel(), computeAllPilarMetrics(), computePilarMetrics(), computeAllSerieMetrics(), computeSerieMetrics(), rankSeriesForPilar(), buildPilarSnapshot(), formatLastPublication() (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (6): buildPlatformRecord(), emptyRow(), handleKeyDown(), handleSave(), SeriesBulkComposer(), wordCount()

### Community 41 - "Community 41"
Cohesion: 0.27
Nodes (12): PostingTimeSuggestions(), createEmptyPilarPlataforma(), getCrossedPostingTimesForPilar(), getCrossedPostingTimesForPilarPlatform(), hasPilarPlatformSchedule(), isTimeWithinWindow(), isWeekdayAllowed(), shouldPersistPilarPlataforma() (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (3): createCacheKey(), PrecacheController, waitUntil()

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (4): renderMetaChip(), buildMetadataLine(), formatLastEdit(), getEntityTagStyle()

### Community 44 - "Community 44"
Cohesion: 0.2
Nodes (5): useBodyScrollLock(), useIsMobile(), BottomSheet(), Dialog(), FixedPanelModal()

### Community 45 - "Community 45"
Cohesion: 0.16
Nodes (6): CacheExpiration, cacheMatchIgnoreParams(), dontWaitFor(), ExpirationPlugin, removeIgnoredSearchParams(), stripParams()

### Community 47 - "Community 47"
Cohesion: 0.32
Nodes (9): comparePublicationTimestamps(), getPublicationTimestamp(), isActiveContent(), isPostableStock(), isPublishedContent(), isPublishedInCycle(), isScriptWritten(), getRollingCycleWindow() (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.36
Nodes (11): mergeContentRecords(), mergeContents(), mergeFetchedAppData(), mergePlatforms(), content(), platform(), testMergeContentsHelper(), testMergeKeepsLocalContentsMissingFromIncoming() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (7): resolvePlatformUuid(), dedupeViolations(), findPilarPlataforma(), getWeekInterval(), publishedThisWeek(), validatePilarFrequency(), validatePlatformSchedule()

### Community 50 - "Community 50"
Cohesion: 0.21
Nodes (4): isInstance(), NetworkFirst, RegExpRoute, waitUntil()

### Community 51 - "Community 51"
Cohesion: 0.27
Nodes (3): CacheTimestampsModel, normalizeURL(), openDB()

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (6): getItemsForDay(), getItemsForDay(), CalendarHoverCard(), getEventDates(), format(), getStatusIcon()

### Community 54 - "Community 54"
Cohesion: 0.2
Nodes (6): backToList(), handleDelete(), handleSave(), SeriesEditPage(), SettingsPageScaffold(), SettingsSectionCard()

### Community 55 - "Community 55"
Cohesion: 0.3
Nodes (11): addBloco(), closeTemplateEditor(), deleteBloco(), deleteTemplate(), handleCreateTemplate(), moveBloco(), openTemplateEditor(), saveBloco() (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.21
Nodes (10): handleAddAnotacao(), handleClose(), createPlatform(), handleAdd(), handleAddAgenda(), handleAddEtapa(), handleSaveEtapa(), handleCreate() (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (8): getContentStatusOptions(), getEditorialContents(), getPostedContents(), getPostingContents(), getRecordingQueueContents(), createContent(), testEditorialContentsShowAllExceptPosted(), testRecordingQueueExcludesBlockedContents()

### Community 59 - "Community 59"
Cohesion: 0.18
Nodes (11): currentUserId(), normalizeProjetoTipo(), saveDnaVoz(), saveItemGeneros(), savePlatform(), savePostingTimeEntry(), savePreference(), saveProjeto() (+3 more)

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (8): replacePostingTimesForPlatform(), getErrorMessage(), addTime(), clearAll(), handleAdd(), handleRemove(), removeTime(), updatePreference()

### Community 61 - "Community 61"
Cohesion: 0.33
Nodes (8): normalizeProfileAuthError(), clearEmailFeedback(), clearPasswordFeedback(), clearProfileFeedback(), handleSaveEmail(), handleSavePassword(), handleSaveProfile(), ProfileSettingsPage()

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (4): SidePanel(), OverlayBody(), handleAddRule(), handleSave()

### Community 63 - "Community 63"
Cohesion: 0.47
Nodes (9): diffViolations(), previewScheduleViolations(), buildContent(), buildPilar(), testDiffViolationsIgnoresExisting(), testHashtagTemplateLimit(), testPreviewScheduleViolationsFrequency(), testWeeklyFrequencyExceeded() (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (9): isMissingMilestoneColumn(), isMissingPublicationKindColumn(), isMissingPublishTimeColumn(), resolvePlatformIds(), saveContent(), saveContentMetric(), saveContentPlataformas(), savePilarPlataformas() (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (4): CacheableResponse, isArray(), isArrayOfClass(), NavigationRoute

### Community 70 - "Community 70"
Cohesion: 0.32
Nodes (8): assertQuerySuccess(), empty(), fetchAllData(), fetchBibliotecaContentCounts(), fetchBibliotecaItemById(), fetchBibliotecaPage(), fetchContentStatusCounts(), fetchDataDomains()

### Community 73 - "Community 73"
Cohesion: 0.38
Nodes (5): ConfirmModal(), backToList(), handleDelete(), handleSave(), PillarEditPage()

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (3): sortPilares(), closePanel(), handleSave()

### Community 75 - "Community 75"
Cohesion: 0.52
Nodes (5): shouldSkipRealtimeRefresh(), testAllowsRealtimeRefreshAfterSuppressionWindow(), testAllowsRealtimeRefreshWithoutLocalMutation(), testSkipsRealtimeRefreshForRecentLocalMutation(), testSkipsRealtimeRefreshWhilePersistInFlight()

### Community 76 - "Community 76"
Cohesion: 0.38
Nodes (4): getPostingTimes(), handleClose(), handleCreate(), resetForm()

### Community 77 - "Community 77"
Cohesion: 0.47
Nodes (3): ensurePlatformRecord(), togglePlatform(), updatePlatform()

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (3): NavigationBlockerProvider(), useNavigationBlocker(), RequireAuth()

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (4): fetchContentsByIds(), fetchContentsPage(), runContentScheduleSelect(), getCachedPlatforms()

### Community 83 - "Community 83"
Cohesion: 0.6
Nodes (4): handleSubmit(), handleToggleMode(), normalizeAuthError(), resetStates()

### Community 85 - "Community 85"
Cohesion: 0.6
Nodes (3): ensurePlatformRecord(), togglePlatform(), updatePlatform()

### Community 97 - "Community 97"
Cohesion: 0.5
Nodes (3): getSaveFeedbackState(), subscribeSaveFeedback(), SaveFeedbackToast()

### Community 98 - "Community 98"
Cohesion: 0.83
Nodes (3): handleAddListItem(), handleRemoveListItem(), updateField()

## Knowledge Gaps
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 6`, `Community 7`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 28`, `Community 29`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 41`, `Community 43`, `Community 44`, `Community 46`, `Community 53`, `Community 54`, `Community 55`, `Community 58`, `Community 60`, `Community 62`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 71`, `Community 72`, `Community 76`, `Community 77`, `Community 79`, `Community 80`, `Community 81`, `Community 83`, `Community 84`, `Community 85`, `Community 87`, `Community 88`, `Community 92`, `Community 93`, `Community 94`, `Community 95`, `Community 96`, `Community 97`, `Community 102`, `Community 103`, `Community 104`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `useAppContext()` connect `Community 27` to `Community 0`, `Community 1`, `Community 2`, `Community 6`, `Community 11`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 22`, `Community 25`, `Community 26`, `Community 28`, `Community 30`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 43`, `Community 46`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 60`, `Community 62`, `Community 67`, `Community 73`, `Community 76`, `Community 79`, `Community 86`, `Community 93`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `Text()` connect `Community 12` to `Community 0`, `Community 1`, `Community 2`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 22`, `Community 23`, `Community 26`, `Community 27`, `Community 28`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 39`, `Community 43`, `Community 46`, `Community 53`, `Community 54`, `Community 55`, `Community 58`, `Community 60`, `Community 61`, `Community 62`, `Community 67`, `Community 68`, `Community 69`, `Community 71`, `Community 73`, `Community 74`, `Community 76`, `Community 77`, `Community 79`, `Community 83`, `Community 84`, `Community 86`, `Community 88`, `Community 91`, `Community 92`, `Community 93`, `Community 95`, `Community 102`, `Community 103`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `generateUUID()` (e.g. with `normalizeContentId()` and `buildPostedVideoContent()`) actually correct?**
  _`generateUUID()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `useAppContext()` (e.g. with `ModuleRoute()` and `BurstModeExperience()`) actually correct?**
  _`useAppContext()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `useIsMobile()` (e.g. with `BottomSheet()` and `Dialog()`) actually correct?**
  _`useIsMobile()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._