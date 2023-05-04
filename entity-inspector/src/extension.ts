import * as vscode from 'vscode';
import * as parser from './parser';
import * as Providers from './providers';
import { EIClass } from './helpers';

class MyDiagnostic{
	static diagnosticCollection = vscode.languages.createDiagnosticCollection('myDiagnostics');
}

let cache = new Map<string, EIClass>();

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "entity-inspector" is now active!');
	
	memorizeEntityesFromWorkspace();
	addDiagnostic(MyDiagnostic.diagnosticCollection);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{pattern: "**"}, // all files
			new Providers.MarkerProvider()),
			
		vscode.languages.registerInlineCompletionItemProvider(
			{pattern: "**"},
			new Providers.SuggestionProvider()),
	);

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		let entities = parser.getEntitiesFromFile(document.uri);
		entities.forEach((entity) => {
			cache.set(entity.name, entity);
		});
	});

	vscode.workspace.onDidDeleteFiles((event: vscode.FileDeleteEvent) => {
		memorizeEntityesFromWorkspace();
	});

}

// memorize all entities from workspace
function memorizeEntityesFromWorkspace() : void {
	cache.clear();
	vscode.workspace.findFiles('**/*.*', '').then((result) => {
		let countEntities = 0;
		result.forEach((file) => {
			parser.getEntitiesFromFile(file).forEach((entity) => {
				cache.set(entity.name, entity);
				countEntities++;
			});
		});
		console.log(`Found ${result.length} files with ${countEntities} entities`);
		console.log(cache);
	});
}

// Diagnostic of errors, warnings, infos and hints
function addDiagnostic(diagnosticCollection: vscode.DiagnosticCollection) {
    vscode.workspace.onDidChangeTextDocument((event) => {
        const text = event.document.getText();

        let errors = text.matchAll(/ERROR/gi);
		let warnings = text.matchAll(/WARN/gi);
		let infos = text.matchAll(/INFO/gi);
		let hints = text.matchAll(/HINT/gi);

		let items: any[] = [];
		items = items.concat(addDiagnosticItems(vscode.DiagnosticSeverity.Error, "This is ERROR hover", errors, event));
		items = items.concat(addDiagnosticItems(vscode.DiagnosticSeverity.Warning, "This is WARNING hover", warnings, event));
		items = items.concat(addDiagnosticItems(vscode.DiagnosticSeverity.Information, "This is INFO hover", infos, event));
		items = items.concat(addDiagnosticItems(vscode.DiagnosticSeverity.Hint, "This is HINT hover", hints, event));
		
		diagnosticCollection.set(event.document.uri, items);
    });
}

function addDiagnosticItems(kind: vscode.DiagnosticSeverity, message: string, mathItems: IterableIterator<RegExpMatchArray>, event: vscode.TextDocumentChangeEvent):
	vscode.Diagnostic[] {

	let items = [];
	for (const match of mathItems) {
		if (match.index === undefined) {
			return [];
		}
		const startPos = event.document.positionAt(match.index);
		const endPos = event.document.positionAt(match.index + match[0].length);
		const range = new vscode.Range(startPos, endPos);
		const diagnostic = new vscode.Diagnostic(range,message, kind);
		items.push(diagnostic);
	}
	if (items.length === 0) {
		return [];
	}
	return items;
}

// This method is called when your extension is deactivated
export function deactivate() {}