
package com.anonymous.pdfreader

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

data class IncomingFile(
    val uri: String,
    val name: String,
    val mimeType: String?
)

object IncomingFileStore {
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var pendingFile: IncomingFile? = null

    @Volatile
    private var reactContext: ReactApplicationContext? = null

    fun register(context: ReactApplicationContext) {
        reactContext = context
    }

    fun takePending(): IncomingFile? {
        return synchronized(this) {
            val file = pendingFile
            pendingFile = null
            file
        }
    }

    fun capture(context: android.content.Context, intent: Intent?) {
        if (intent == null) return

        val sourceUri: Uri = when (intent.action) {
            Intent.ACTION_VIEW -> {
                intent.data ?: intent.clipData?.getItemAt(0)?.uri
            }

            Intent.ACTION_SEND -> {
                if (Build.VERSION.SDK_INT >= 33) {
                    intent.getParcelableExtra(
                        Intent.EXTRA_STREAM,
                        Uri::class.java
                    )
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
                } ?: intent.clipData?.getItemAt(0)?.uri
            }

            Intent.ACTION_SEND_MULTIPLE -> {
                intent.clipData?.getItemAt(0)?.uri
            }

            else -> null
        } ?: return

        val mimeType = intent.type ?: context.contentResolver.getType(sourceUri)

        executor.execute {
            try {
                val originalName = getDisplayName(context, sourceUri)
                    ?: fallbackName(mimeType)

                val safeName = originalName
                    .replace(Regex("[^a-zA-Z0-9._-]"), "_")
                    .ifBlank { fallbackName(mimeType) }

                val directory = File(context.cacheDir, "incoming-files")
                if (!directory.exists() && !directory.mkdirs()) {
                    throw IllegalStateException(
                        "Could not create incoming file directory"
                    )
                }

                val destination = File(
                    directory,
                    "${System.currentTimeMillis()}-$safeName"
                )

                context.contentResolver.openInputStream(sourceUri).use { input ->
                    if (input == null) {
                        throw IllegalStateException(
                            "Android could not open the incoming file"
                        )
                    }

                    FileOutputStream(destination).use { output ->
                        input.copyTo(output)
                    }
                }

                val receivedFile = IncomingFile(
                    uri = Uri.fromFile(destination).toString(),
                    name = originalName,
                    mimeType = mimeType
                )

                synchronized(this) {
                    pendingFile = receivedFile
                }

                mainHandler.post {
                    val currentContext = reactContext
                    if (currentContext != null &&
                        currentContext.hasActiveReactInstance()
                    ) {
                        currentContext
                            .getJSModule(
                                DeviceEventManagerModule
                                    .RCTDeviceEventEmitter::class.java
                            )
                            .emit("incomingFile", toMap(receivedFile))
                    }
                }
            } catch (error: Exception) {
                Log.e(
                    "IncomingFileReceiver",
                    "Unable to import incoming file",
                    error
                )
            }
        }
    }

    private fun getDisplayName(
        context: android.content.Context,
        uri: Uri
    ): String? {
        if (uri.scheme == "file") {
            return uri.lastPathSegment?.substringAfterLast('/')
        }

        return context.contentResolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                val column = cursor.getColumnIndex(
                    OpenableColumns.DISPLAY_NAME
                )
                if (column >= 0) cursor.getString(column) else null
            } else {
                null
            }
        }
    }

    private fun fallbackName(mimeType: String?): String {
        val extension = when (mimeType?.lowercase()) {
            "application/pdf" -> "pdf"
            "application/msword" -> "doc"
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "docx"
            "application/vnd.ms-excel" -> "xls"
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> "xlsx"
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            else -> "bin"
        }

        return "incoming-file.$extension"
    }

    private fun toMap(file: IncomingFile) =
        Arguments.createMap().apply {
            putString("uri", file.uri)
            putString("name", file.name)
            putString("mimeType", file.mimeType)
        }
}

class IncomingFileModule(
    context: ReactApplicationContext
) : ReactContextBaseJavaModule(context) {

    init {
        IncomingFileStore.register(context)
    }

    override fun getName() = "IncomingFile"

    @ReactMethod
    fun getInitialFile(promise: Promise) {
        try {
            val file = IncomingFileStore.takePending()

            if (file == null) {
                promise.resolve(null)
            } else {
                promise.resolve(
                    Arguments.createMap().apply {
                        putString("uri", file.uri)
                        putString("name", file.name)
                        putString("mimeType", file.mimeType)
                    }
                )
            }
        } catch (error: Exception) {
            promise.reject("INCOMING_FILE_ERROR", error)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required by NativeEventEmitter.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required by NativeEventEmitter.
    }
}

class IncomingFilePackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return listOf(IncomingFileModule(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
