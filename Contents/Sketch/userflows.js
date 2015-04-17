@import 'common.js'

var userDefaults = {
	flowsPageName:"_Flows",
	exportScaleIndex:1,
	flowIndicatorColor:"#F5A623",
	organizeFlows:1,
	showModifiedDate:1,
	minimumTapArea:44.0
}

var scaleOptions = ['1x', '2x'];
iconName = "icon.png"

var askForFlowDetails = function() {
	initDefaults(userDefaults)
	
	if(selectionIsEmpty()) {
		showDialog("Select layers or artboards you want to use to make a flow.")
		return
	}
	
	var alert = createAlertBase(false)
	[alert addButtonWithTitle: 'Generate'];
	[alert addButtonWithTitle: 'Cancel'];
	
	[alert setMessageText: 'Generate a User Flow']
	
	// suggest presiously used Flow Names
	var allArtboards = getAllArtboardsInDoc(),
		flowArtboardNames = [NSMutableArray new],
		flowArtboardName;
	
	flowArtboardNames.addObject("")
	var loop = [allArtboards objectEnumerator]
	while (artboard = [loop nextObject]) {
		if ([currentCommand valueForKey:@"isUserFlow" onLayer:artboard forPluginIdentifier:pluginDomain] == 1) {
			flowArtboardName = [artboard name]
			if (![flowArtboardNames containsObject:flowArtboardName] && flowArtboardName != "Untitled Flow")
				flowArtboardNames.addObject(flowArtboardName)
		}
	}
	
	[alert addTextLabelWithValue: 'Flow Name'] // 0
	if([flowArtboardNames count] == 0) {
		[alert addTextFieldWithValue: 'New Flow'] // 1
	} else {
    	[alert addAccessoryView: createSelect(flowArtboardNames, 0)] // 1
	}
	
	[alert addTextLabelWithValue: 'Description'] // 2
	[alert addAccessoryView: createTextArea("", 300, 100)] // 3
	
	[alert addAccessoryView: createSeparator()] // 4
	
	var pageNames = [NSMutableArray new],
		pages = [doc pages], pName;
	pageNames.addObject("_Flows")
	var loop = [pages objectEnumerator]
	while (page = [loop nextObject]) {
		pName = [page name]
		if (pName != "_Flows") pageNames.addObject(pName)
	}
	pageNames.addObject("[New Page]")
	
	var lastSelectedPageName = getDefault('flowsPageName'),
		lastSelectedPageIndex = [pageNames containsObject:lastSelectedPageName] ? [pageNames indexOfObject:lastSelectedPageName] : 0
	[alert addTextLabelWithValue: 'Add to Page'] // 5
	[alert addAccessoryView: createDropDown(pageNames, lastSelectedPageIndex)] // 6
	
	[alert addAccessoryView: createCheckbox({name: 'Keep _Flows Page Organized', value: 'organizeFlows'}, getDefault('organizeFlows'))] // 7
	
	if ([alert runModal] == "1000") {
		var view, pageName, 
			scaleIndex = getDefault('exportScaleIndex');
		view = elementAtIndex(alert, 6)
		pageName = [view titleOfSelectedItem];
		
		var settings = {
			flowName: valueAtIndex(alert, 1),
			flowDescription: valueAtIndex(alert, 3),
			showModifiedDate: getDefault('showModifiedDate'),
			exportToPage: pageName,
			organizeFlows: checkedAtIndex(alert, 7),
			exportToScale: scaleIndex + 1,
			flowIndicatorColor: getDefault('flowIndicatorColor'),
			minimumTapArea: getDefault('minimumTapArea')
		}
		// Save Defaults
		setDefault('flowsPageName', pageName)
		setDefault('organizeFlows', settings.organizeFlows)
		
		generateFlowWithSettings(settings)
	}
}

var generateFlowWithSettings = function(s) {
	
	var exportScale = s.exportToScale,
		spacing = 50*exportScale,
		outerPadding = 40*exportScale,
		selectedArtboards = [NSMutableArray array],
		flowBoard = [MSArtboardGroup new],
		flowWidth = outerPadding, 
		flowHeight = 0,
		flowName = s.flowName,
		flowGroup = addGroup(flowName, flowBoard),
		flowDescription = s.flowDescription,
		flowIndicatorColor = (s.flowIndicatorColor.indexOf("#") == -1) ? s.flowIndicatorColor : s.flowIndicatorColor.substr(1),
		minimumTapArea = s.minimumTapArea,
		flowLabel, flowFrame, optimalPosition, flowDescriptionLabel, modifiedDateLabel;
	
	// if(s.showModifiedDate == 1) {	
	// 		if (s.flowDescription != "") flowDescription += "\n--------\n"
	// 		flowDescription += "Modified on " + getCurrentDateAsString()
	// 	}
	
	// get artboards from selection	
	var ab, selectedObjectRect, artboardAndRect;
	var loop = [selection objectEnumerator]
	while (item = [loop nextObject]) {
		ab = getParentArtboard(item);
		if (![ab hasBackgroundColor]) setArtboardColor(ab, 'FFFFFF')
		selectedObjectRect = isArtboard(item) ? {x:0,y:0,width:0,height:0} : addPaddingIfRequired(getFrame(item, ab), minimumTapArea);
		artboardAndRect = {artboard:ab, selectionRect:selectedObjectRect}
		if(![selectedArtboards containsObject:artboardAndRect]) {
			[selectedArtboards addObject:artboardAndRect];
		}
	}
	
	// sort artboards by x position
	selectedArtboards = [selectedArtboards sortedArrayUsingDescriptors:[
		[NSSortDescriptor sortDescriptorWithKey:@"artboard.absoluteRect.rulerX" ascending:true]
	]]
	
	// setup the flow artboard	
	[currentPage addLayers:[flowBoard]]
	if (flowName == "") [flowBoard setName:"Untitled Flow"]
	else [flowBoard setName:flowName]
	optimalPosition = getOptimalPositionForNewArtboardInPage()
	setPosition(flowBoard, optimalPosition.x, optimalPosition.y)
	setArtboardColor(flowBoard, 'FFFFFF')
	flowFrame = getRect(flowBoard)
	[currentCommand setValue:1 forKey:@"isUserFlow" onLayer:flowBoard forPluginIdentifier:pluginDomain]
	
	// setup flow name and description labels	
	flowDescriptionLabel = addText("**Flow_Meta", flowBoard, 12*exportScale);
	flowLabel = addText(flowName, flowBoard, 18*exportScale);
	
	if(s.showModifiedDate == 1) {
		modifiedDateLabel = addText("Modified Date", flowBoard, 9*exportScale);
		setColor(modifiedDateLabel, '999999')
		[modifiedDateLabel setIsLocked:true];
		setPosition(modifiedDateLabel, outerPadding, outerPadding)
		setSize(modifiedDateLabel, 10, 10)
	}
	
	setColor(flowDescriptionLabel, '999999')
	[flowDescriptionLabel setIsLocked:true];
	[flowLabel setIsLocked:true];
	setPosition(flowLabel, outerPadding, outerPadding);
	setSize(flowLabel, 10, 10)
	setPosition(flowDescriptionLabel, outerPadding, outerPadding)
	setSize(flowDescriptionLabel, 10, 10)
	
	// create images for artboards and populate the flow artboard
	var artboard, screenImage, screenLayer, screenFrame, aWidth, aHeight, selectionRect, hitAreaLayer, hitAreaFrame, arrowContainer, textLayer, textFrame, screenContainer, screenY, arrow, arrowStartPoint, arrowEndPoint, arrowY, screenNumber = 0;
	
	loop = [selectedArtboards objectEnumerator]
	while (ar = [loop nextObject]) {
		artboard = ar.artboard;
		selectionRect = ar.selectionRect;
		screenFrame = getFrame(artboard)
		aWidth = screenFrame.width*exportScale
		aHeight = screenFrame.height*exportScale
		
		screenContainer = addGroup([artboard name], flowGroup)
		setPosition(screenContainer, flowWidth, outerPadding)
		
		screenNumber++;
		textLayer = addText([artboard name], screenContainer, 12*exportScale)
		setPosition(textLayer, 0, 0)
		setSize(textLayer, aWidth, 10)
		[textLayer setTextBehaviour:1]
		[textLayer setStringValue:screenNumber + ": " + [artboard name]]
		textFrame = getFrame(textLayer)
		screenY = textFrame.height+10
	
		screenLayer = flattenLayerToBitmap(artboard, true, exportScale)
		setPosition(screenLayer, 0, screenY, true)
		removeLayer(screenLayer)
		[screenContainer addLayers:[screenLayer]]
		setShadow(screenLayer)
	
		// add hit area layer
		if(selectionRect.width != 0 && selectionRect.height != 0) {
			arrowContainer = addGroup("Flow Indicator", screenContainer)
			hitAreaLayer = addShape("Tap Area", arrowContainer)
			setPosition(hitAreaLayer, flowFrame.x+flowWidth+(selectionRect.x*exportScale), flowFrame.y+outerPadding+screenY+(selectionRect.y*exportScale), true)
			setSize(hitAreaLayer, (selectionRect.width*exportScale), (selectionRect.height*exportScale), true)
			setColor(hitAreaLayer, '000000', 0)
			setBorder(hitAreaLayer, 2*exportScale, 2, flowIndicatorColor, 1)
		
			hitAreaFrame = getFrame(hitAreaLayer)
			arrowY = hitAreaFrame.y+(hitAreaFrame.height/2);
			arrowStartPoint = {x:hitAreaFrame.x+hitAreaFrame.width, y:arrowY}
			arrowEndPoint = {x:aWidth+(spacing/2), y:arrowY}
			arrow = addLine('Flow Arrow', arrowContainer, arrowStartPoint, arrowEndPoint, 2*exportScale, flowIndicatorColor)

			[[arrow firstLayer] setEndDecorationType:1]
		
			[arrowContainer resizeRoot:false];
		}
	
		[screenContainer resizeRoot:false];
		flowWidth += getFrame(screenContainer).width + spacing
		flowHeight = Math.max(flowHeight, getFrame(screenContainer).height)
	}

	// update flow artboard dimensions and add it to current page
	[flowGroup resizeRoot:false];
	[flowGroup setHasClickThrough:true];
	
	flowWidth -= (spacing-outerPadding)
	flowHeight += (outerPadding*2);
	
	setSize(flowLabel, flowWidth-(outerPadding*2), 10);
	[flowLabel setTextBehaviour:1];
	[flowLabel setStringValue:flowName];
	[flowLabel adjustFrameToFit];
	var flowLabelFrame = getFrame(flowLabel);
	
	setSize(flowDescriptionLabel, flowWidth-(outerPadding*2), 10);
	[flowDescriptionLabel setTextBehaviour:1];
	[flowDescriptionLabel setStringValue:flowDescription];
	[flowDescriptionLabel adjustFrameToFit];
	setPosition(flowDescriptionLabel, outerPadding, outerPadding+flowLabelFrame.height + 14)
	var descriptionLabelFrame = getFrame(flowDescriptionLabel);
	
	if(s.showModifiedDate == 1) {
		var modifiedOnText = "Modified on " + getCurrentDateAsString();
		setSize(modifiedDateLabel, flowWidth-(outerPadding*2), 10);
		[modifiedDateLabel setTextBehaviour:1];
		[modifiedDateLabel setStringValue:modifiedOnText];
		[modifiedDateLabel adjustFrameToFit];
		setPosition(modifiedDateLabel, outerPadding, outerPadding+flowLabelFrame.height + 14+descriptionLabelFrame.height + 10)
	}
	
	var flowInfoHeight = (s.showModifiedDate == 1) ? flowLabelFrame.height + descriptionLabelFrame.height + 10 + getFrame(modifiedDateLabel).height + 14 : flowLabelFrame.height + descriptionLabelFrame.height + 14;
	
	setPosition(flowGroup, flowLabelFrame.x, flowInfoHeight+(outerPadding*2))
	setSize(flowBoard, flowWidth, flowHeight+flowInfoHeight+outerPadding)

	[flowGroup resizeRoot:false];
	
	// move flow to another page if required
	if (s.exportToPage != [currentPage name]) {
		[currentPage removeLayer: flowBoard]
		
		var flowsPage, existingPages = [doc pages];
		loop = [existingPages objectEnumerator]
		while (item = [loop nextObject]) {
			if([item name] == s.exportToPage) {
				flowsPage = item
				break;
			}
		}
		if(!flowsPage) {
			flowsPage = [doc addBlankPage]
			if (s.exportToPage == "[New Page]") {
				var newPageName = "Page " + [existingPages count]
				[flowsPage setName:newPageName]
				setDefault('flowsPageName', newPageName)
			} else {
				[flowsPage setName:s.exportToPage]
			}
		}
		[doc setCurrentPage:flowsPage]
		[flowsPage addLayers:[flowBoard]]
		
		if([flowsPage name] == "_Flows" && s.organizeFlows) { 
			organizeArtboardsInPage(flowsPage, 160, 6)
		} else {
			optimalPosition = getOptimalPositionForNewArtboardInPage(flowsPage)
			setPosition(flowBoard, optimalPosition.x, optimalPosition.y)
		}
	}
	
	
	[flowBoard setConstrainProportions:false];
	[flowBoard resizeRoot:false];
	
	makeExportable(flowBoard)
	[flowBoard select:true byExpandingSelection:false];
	
	// zoom to fit new flowboard
	[[doc currentView] zoomToFitRect:[[flowBoard absoluteRect] rect]];
}

var addPaddingIfRequired = function(rect, minDimensions) {
	var diff;
	if (rect.width < minDimensions) {
		diff = minDimensions-rect.width
		rect.x = Math.round(rect.x - (diff/2))
		rect.width = Math.round(rect.width  + diff)
	}
	if (rect.height < minDimensions) {
		diff = minDimensions-rect.height
		rect.y = Math.round(rect.y - (diff/2))
		rect.height = Math.round(rect.height  + diff)
	}
	return rect
}

var showSettingsDialog = function() {
	initDefaults(userDefaults)
	
	var alert = createAlertBase(),
		versionText = "Version " + [plugin version] + "  -  © Aby Nimbalkar";
	[alert setMessageText: 'User Flow Settings']
	[alert setInformativeText: versionText]
	
	var lastSelectedExportScaleIndex = getDefault('exportScaleIndex')
	[alert addTextLabelWithValue: 'Export Artboards at'] // 0
	var radioButtons = createRadioButtons(scaleOptions, 1, scaleOptions.length, "Scale Options", lastSelectedExportScaleIndex)
	[alert addAccessoryView: radioButtons] // 1
	
	[alert addAccessoryView: createSeparator()] // 2
	
	[alert addTextLabelWithValue: 'Minimum Tap Area'] // 3
	[alert addAccessoryView: createTextArea(getDefault('minimumTapArea')+"px", 50, 23)] // 4
	
	[alert addAccessoryView: createSeparator()] // 5
	
	[alert addTextLabelWithValue: 'Color of Flow Indicators'] // 6
	var colorWell = createColorWell(getDefault('flowIndicatorColor'))
	[alert addAccessoryView: colorWell] // 7
	
	[alert addAccessoryView: createSeparator()] // 8
	
	[alert addAccessoryView: createCheckbox({name: 'Show Date on Flows', value: 'showModifiedDate'}, getDefault('showModifiedDate'))] // 9
	
	[alert addAccessoryView: createSeparator()] // 10
	
	[alert addTextLabelWithValue: 'Feedback: aby@silverux.com'] // 11
	
	[alert addAccessoryView: createSeparator()] // 12
	
	[alert addButtonWithTitle: 'Reset Defaults'];
	
	var response = [alert runModal]
	
	if (response == "1000") {
		scaleIndex = [[radioButtons selectedCell] tag]-100;
		
		var newColor = [colorWell color],
			newHex = NSColorToHex(newColor)
		setDefault('exportScaleIndex', scaleIndex)
		setDefault('flowIndicatorColor', newHex)
		setDefault('minimumTapArea', parseFloat(valueAtIndex(alert, 4)))
		setDefault('showModifiedDate', checkedAtIndex(alert, 9))
	} else if (response == "1002") {
		resetDefaults(userDefaults)
	}
}