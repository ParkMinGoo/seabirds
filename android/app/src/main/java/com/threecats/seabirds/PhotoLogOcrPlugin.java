package com.threecats.seabirds;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions;

@CapacitorPlugin(name = "PhotoLogOcr")
public class PhotoLogOcrPlugin extends Plugin {
    @PluginMethod
    public void recognize(PluginCall call) {
        String dataUrl = call.getString("image");
        if (dataUrl == null || dataUrl.isEmpty()) {
            call.reject("촬영한 사진을 읽을 수 없습니다.");
            return;
        }
        try {
            int comma = dataUrl.indexOf(',');
            byte[] bytes = Base64.decode(comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("사진 형식을 인식할 수 없습니다.");
                return;
            }
            InputImage image = InputImage.fromBitmap(bitmap, 0);
            TextRecognizer recognizer = TextRecognition.getClient(new KoreanTextRecognizerOptions.Builder().build());
            recognizer.process(image)
                .addOnSuccessListener(result -> {
                    JSObject response = new JSObject();
                    response.put("text", result.getText());
                    call.resolve(response);
                    recognizer.close();
                    bitmap.recycle();
                })
                .addOnFailureListener(error -> {
                    call.reject("사진의 글자를 인식하지 못했습니다. 더 밝고 수직으로 다시 촬영해 주세요.", error);
                    recognizer.close();
                    bitmap.recycle();
                });
        } catch (Exception error) {
            call.reject("사진 처리 중 오류가 발생했습니다.", error);
        }
    }
}
