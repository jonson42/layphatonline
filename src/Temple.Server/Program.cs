using System.Text;
using System.Text.Json;
using Microsoft.Extensions.FileProviders;
using Temple.Server.Models;
using Temple.Server.Services;
using Temple.Server.WebSocket;

// Thiet lap ma hoa UTF-8 toan cuc cho Console va Stdio streams
Console.OutputEncoding = Encoding.UTF8;
Console.InputEncoding = Encoding.UTF8;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p =>
    {
        p.AllowAnyOrigin()
         .AllowAnyHeader()
         .AllowAnyMethod();
    });
    options.AddPolicy("AllowAll", p =>
    {
        p.AllowAnyOrigin()
         .AllowAnyHeader()
         .AllowAnyMethod();
    });
});

builder.Services.AddSingleton<ITtsService, TtsService>();
builder.Services.AddSingleton<ITempleService, TempleService>();
builder.Services.AddSingleton<ITikTokService, TikTokService>();
builder.Services.AddSingleton<RpcDispatcher>();
builder.Services.AddSingleton<JsonRpcWebSocketHandler>();
builder.Services.AddHostedService<SimulationService>();

var app = builder.Build();

app.UseCors("AllowAll");
app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

// Setup paths
string contentRoot = app.Environment.ContentRootPath;
string dataDir = Directory.Exists(Path.Combine(contentRoot, "data"))
    ? Path.Combine(contentRoot, "data")
    : Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "data"));

string ttsCacheDir = Path.Combine(dataDir, "tts-cache");
Directory.CreateDirectory(ttsCacheDir);

// Static file serving for TTS cache: /tts-cache/{file}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(ttsCacheDir),
    RequestPath = "/tts-cache",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=604800";
    }
});

// Static file serving for React build if client dist exists
string clientCandidate = Path.GetFullPath(Path.Combine(contentRoot, "..", "Temple.Client", "dist"));
string clientDist = Directory.Exists(clientCandidate)
    ? clientCandidate
    : (Directory.Exists(Path.Combine(contentRoot, "dist"))
        ? Path.Combine(contentRoot, "dist")
        : Path.Combine(contentRoot, "wwwroot"));

if (Directory.Exists(clientDist))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(clientDist),
        RequestPath = ""
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(clientDist),
        RequestPath = ""
    });
}
else
{
    app.UseStaticFiles(); // Default wwwroot
}

// ============================================================================
// 1. WEBSOCKET ENDPOINT: /ws
// ============================================================================
app.Map("/ws", async (HttpContext context, JsonRpcWebSocketHandler wsHandler) =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        await wsHandler.HandleWebSocketAsync(context, webSocket);
    }
    else
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
    }
});

// ============================================================================
// 2. HTTP JSON-RPC 2.0 ENDPOINT: POST /rpc
// ============================================================================
app.MapPost("/rpc", async (HttpContext context, RpcDispatcher dispatcher) =>
{
    try
    {
        using var reader = new StreamReader(context.Request.Body);
        string body = await reader.ReadToEndAsync();
        var req = JsonSerializer.Deserialize<JsonRpcRequest>(body);

        if (req == null || string.IsNullOrWhiteSpace(req.Method))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return Results.Json(new JsonRpcResponse
            {
                JsonRpc = "2.0",
                Id = req?.Id,
                Error = JsonRpcError.InvalidRequest("Thiếu method trong yêu cầu JSON-RPC")
            });
        }

        try
        {
            var result = await dispatcher.DispatchAsync(req.Method, req.Params);
            return Results.Json(new JsonRpcResponse
            {
                JsonRpc = req.JsonRpc ?? "2.0",
                Id = req.Id,
                Result = result
            });
        }
        catch (Exception ex)
        {
            return Results.Json(new JsonRpcResponse
            {
                JsonRpc = req.JsonRpc ?? "2.0",
                Id = req.Id,
                Error = JsonRpcError.ServerError(ex.Message)
            });
        }
    }
    catch (Exception ex)
    {
        return Results.Json(new JsonRpcResponse
        {
            JsonRpc = "2.0",
            Id = null,
            Error = JsonRpcError.ParseError(ex.Message)
        });
    }
}).RequireCors("AllowAll");

// ============================================================================
// 3. REST ENDPOINTS: /api/state, /api/tts
// ============================================================================
app.MapGet("/api/state", (ITempleService templeService) =>
{
    return Results.Json(templeService.GetPublicState());
}).RequireCors("AllowAll");

app.MapMethods("/api/tts", new[] { "GET", "POST" }, async (HttpContext context, ITtsService ttsService, ITempleService templeService) =>
{
    string text = string.Empty;
    string? voice = null;

    if (context.Request.Method == "GET")
    {
        text = context.Request.Query["text"].ToString();
        voice = context.Request.Query["voice"].ToString();
    }
    else
    {
        try
        {
            using var reader = new StreamReader(context.Request.Body);
            string body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("text", out var tp)) text = tp.GetString() ?? string.Empty;
                if (doc.RootElement.TryGetProperty("voice", out var vp)) voice = vp.GetString();
            }
        }
        catch { }
    }

    if (string.IsNullOrWhiteSpace(text))
    {
        return Results.BadRequest(new { ok = false, error = "Thiếu nội dung text cần đọc" });
    }

    if (string.IsNullOrEmpty(voice))
    {
        voice = templeService.GetPublicState().Settings.TtsVoice ?? "maichi";
    }

    var result = await ttsService.SynthesizeAsync(text, voice);
    return Results.Json(result);
}).RequireCors("AllowAll");

app.MapGet("/api/tunnel-url", () =>
{
    string localFile = Path.Combine(contentRoot, "cloudflare_url.txt");
    string parentFile = Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "cloudflare_url.txt"));
    string filePath = File.Exists(localFile) ? localFile : parentFile;

    if (File.Exists(filePath))
    {
        string url = File.ReadAllText(filePath).Trim();
        if (!string.IsNullOrWhiteSpace(url))
        {
            return Results.Json(new { ok = true, url });
        }
    }
    return Results.Json(new { ok = false, url = "" });
}).RequireCors("AllowAll");

// SPA fallback for /admin and /*
app.MapFallback(async (HttpContext context) =>
{
    if (Directory.Exists(clientDist))
    {
        string indexPath = Path.Combine(clientDist, "index.html");
        if (File.Exists(indexPath))
        {
            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.SendFileAsync(indexPath);
            return;
        }
    }
    context.Response.StatusCode = StatusCodes.Status200OK;
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.WriteAsync("<h1>Chùa Thiên Sơn C# Backend đang chạy!</h1><p>Vui lòng mở React client tại cổng 5173 hoặc build client (npm run build trong src/Temple.Client).</p>");
});

Console.WriteLine("============================================================");
Console.WriteLine("🪷 CHÙA ONLINE TIKTOK LIVE RPC (.NET 9 C# BACKEND)");
Console.WriteLine("📡 Máy chủ C# ASP.NET Core đang lắng nghe tại: http://localhost:5000");
Console.WriteLine("🔌 JSON-RPC 2.0 Endpoint: POST http://localhost:5000/rpc (ws://localhost:5000/ws)");
Console.WriteLine("============================================================");

// Auto-connect default TikTok channel if specified
var configUser = Environment.GetEnvironmentVariable("TIKTOK_USER") ?? "thienkim20060402";
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(2500);
        var tikTokService = app.Services.GetRequiredService<ITikTokService>();
        await tikTokService.ConnectAsync(configUser);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Auto-Connect @{configUser}] {ex.Message}");
    }
});

app.MapGet("/healthz", () => Results.Ok("OK"));

var port = Environment.GetEnvironmentVariable("PORT")
    ?? Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS");

if (string.IsNullOrEmpty(port))
{
    port = app.Environment.IsProduction() ? "8080" : "5000";
}

Console.WriteLine($"🚀 Server listening on http://0.0.0.0:{port} (Env: {app.Environment.EnvironmentName})");
app.Run($"http://0.0.0.0:{port}");
